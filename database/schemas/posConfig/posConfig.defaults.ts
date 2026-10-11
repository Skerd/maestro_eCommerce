import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import PosConfig, {type IPosConfig} from "./posConfig";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {CreatePosPaymentMethodsResult} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.defaults";

export const TIRANA_FRONT_TILL_NAME = demoName("Tirana Front Till");

/**
 * Seeds the Tirana front till. Requires at least one warehouse (schema validator).
 * Does not write `managerPins.pinHash`. Idempotent on `{company, name}`.
 */
export async function createPosConfigs(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    methods: CreatePosPaymentMethodsResult,
    warehouseId: Types.ObjectId | undefined,
    fiscalConfigId: Types.ObjectId | undefined,
): Promise<HydratedDocument<IPosConfig> | undefined> {
    const logger = getLogger("mongoDbInitialization-createPosConfigs", parentLogger);
    logger.start("Creating POS configs...");

    if (!warehouseId) {
        logger.warn("Skipping POS config: Tirana warehouse was not seeded.");
        logger.finish("Finished creating POS configs!", 0);
        return undefined;
    }
    const cash = methods.bySeedKey["pos-pm-cash"];
    const card = methods.bySeedKey["pos-pm-card"];
    if (!cash || !card) {
        logger.warn("Skipping POS config: Cash/Card payment methods were not seeded.");
        logger.finish("Finished creating POS configs!", 0);
        return undefined;
    }

    try {
        const payload = {
            name: TIRANA_FRONT_TILL_NAME,
            paymentMethods: [cash._id, card._id],
            warehouses: [warehouseId],
            currency: currencyId,
            ...(fiscalConfigId ? {fiscalConfig: fiscalConfigId} : {}),
            receiptHeader: "Demo — Tirana Front Till",
            receiptFooter: "Thank you — demo till",
            ifaceBarcodeScanner: true,
            ifaceCashControl: true,
            allowDiscount: true,
            allowQuantityChange: true,
            allowOversell: false,
            pinForDiscount: false,
            pinForCashOut: false,
            pinForRefund: false,
            isActive: true,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await PosConfig.findOne({company: company._id, name: TIRANA_FRONT_TILL_NAME});
        if (!doc) {
            doc = await PosConfig.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating POS configs!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating POS config: ${message}`);
        logger.fail("Failed to create POS configs!");
        return undefined;
    }
}
