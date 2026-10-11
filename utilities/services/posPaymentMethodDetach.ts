import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";

/**
 * Detach a payment method from all company POS configs.
 * Fails if any config would be left with zero payment methods.
 */
export async function detachPosPaymentMethodFromConfigs(
    methodId: ObjectId,
    opts: {
        companyId: ObjectId;
        languageCode: string;
        session?: ClientSession | null;
    },
): Promise<void> {
    const {companyId, languageCode, session} = opts;

    const configs = await PosConfig.find({
        company: companyId,
        paymentMethods: methodId,
    }).noDeleted().session(session ?? null);

    for (const config of configs) {
        const methods = ((config.paymentMethods as any[]) ?? []).map((id) => id?.toString?.() ?? String(id));
        const remaining = methods.filter((id) => id !== methodId.toString());
        if (remaining.length === 0) {
            throw apiValidationException(
                "pos_payment_method_last_on_config",
                "paymentMethods",
                null,
                languageCode,
            );
        }
    }

    if (configs.length > 0) {
        await PosConfig.updateMany(
            {
                company: companyId,
                paymentMethods: methodId,
            },
            {$pull: {paymentMethods: methodId}},
            {session: session ?? undefined},
        ).noDeleted();
    }
}
