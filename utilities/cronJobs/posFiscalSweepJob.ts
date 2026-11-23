/**
 * Every 5 minutes: registers with CIS the till sales that committed but never reached it, because the process stopped
 * between the sale's commit and the CIS call (D97, TD-B75). Each sale is sent through the pay request's own
 * `registerPosSaleWithCis`, so it is tried once: a failure is stored on the sale and left to the manual re-send.
 * A sale marked as sent to CIS with no answer stored may already be registered: it is never sent again, only reported.
 */

import type {ObjectId} from "mongodb";
import {CONSTANTS} from "@coreModule/environment";
import {FISCALIZATION_AVAILABLE} from "armonia/src/modules/finance/helpers/fiscalAvailability";
import {getLogger, type serverLogger} from "@coreModule/loggers/serverLog";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {fiscalConfigService} from "@financeModule/database/schemas/fiscalConfig/fiscalConfig.service";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {refToId} from "@eCommerceModule/workflows/posTillOps";
import {registerPosSaleWithCis} from "@eCommerceModule/workflows/posService";

const BATCH_SIZE = 50;
/** A sale changed more recently may still be in its pay request, between the commit and the CIS call. */
export const POS_FISCAL_SWEEP_GRACE_MS = 2 * 60 * 1000;
/** Older sales are left to a manual re-send, so the sweep never back-registers a till's sales from before its CIS setup. */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** A send this old has had its answer or its timeout (60 s per CIS call) long ago. */
const LOST_ANSWER_AFTER_MS = 10 * 60 * 1000;

export async function runPosFiscalSweep(company: ObjectId, parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("pos_fiscal_sweep", parentLogger);
    if (!FISCALIZATION_AVAILABLE) {
        logger.debug("Fiscalization waits for certification (D186): nothing to send.");
        return;
    }
    const languageCode = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";
    logger.start("Running POS fiscal sweep...");

    try {
        // Tills whose fiscal config can register: active, with a certificate (as the pay request decides)
        const fiscalConfigs = await fiscalConfigService.find({company, isActive: true, "certificate.0": {$exists: true}}, {}, undefined, "_id");
        const tills = fiscalConfigs.length
            ? await posConfigService.find({company, fiscalConfig: {$in: fiscalConfigs.map(config => config._id)}}, {}, undefined, "fiscalConfig")
            : [];
        const fiscalConfigByTill = new Map(tills.map(till => [till._id.toString(), refToId(till.fiscalConfig)]));

        const now = Date.now();
        const unregistered = tills.length ? await posOrderService.find({
            company,
            config: {$in: tills.map(till => till._id)},
            isRefund: false,
            state: {$in: ["paid", "refunded"]},
            nslf: null,
            nivf: null,
            fiscalError: null,
            fiscalRegisteringAt: null,
            updatedAt: {$lte: new Date(now - POS_FISCAL_SWEEP_GRACE_MS), $gte: new Date(now - LOOKBACK_MS)},
        }, {}, undefined, "config", {updatedAt: 1}, BATCH_SIZE) : [];

        let registered = 0;
        let failed = 0;
        if (unregistered.length) {
            const owner = await companyService.findById(company, {}, undefined, "name vat");
            const ctx = {logger, languageCode, company: {_id: company, name: owner?.name, vat: owner?.vat}};
            for (const order of unregistered) {
                const fiscalConfigId = fiscalConfigByTill.get(refToId(order.config) ?? "");
                if (!fiscalConfigId) continue;
                const fiscal = await registerPosSaleWithCis(order._id.toString(), fiscalConfigId, ctx);
                if (fiscal.fault) failed += 1;
                else registered += 1;
            }
        }

        const lostAnswers = await posOrderService.find({
            company,
            fiscalRegisteringAt: {$lte: new Date(now - LOST_ANSWER_AFTER_MS)},
            nslf: null,
            nivf: null,
        }, {}, undefined, "name", {createdAt: 1}, BATCH_SIZE);
        if (lostAnswers.length) {
            logger.warn(
                `${lostAnswers.length} till sale(s) were sent to CIS but no answer was stored, so they may be registered: ` +
                `check them in the CIS portal (${lostAnswers.map(order => order.name).join(", ")})`,
            );
        }

        logger.finish(`POS fiscal sweep finished: ${registered} registered, ${failed} failed, ${lostAnswers.length} need a manual check.`);
    } catch (e: unknown) {
        logger.err("POS fiscal sweep failed", e);
        logger.finish("POS fiscal sweep finished with errors.");
    }
}
