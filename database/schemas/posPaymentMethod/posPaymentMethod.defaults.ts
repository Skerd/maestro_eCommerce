import type {HydratedDocument} from "mongoose";
import PosPaymentMethod, {type IPosPaymentMethod} from "./posPaymentMethod";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";

export type PosPaymentMethodSeed = {
    seedKey: string;
    name: string;
    type: "cash" | "card";
    sequence: number;
    /** Card must keep `terminalEnabled: true` or the pre-save hook rewrites type to cash. */
    terminalEnabled: boolean;
    cashQuickAmounts?: string;
};

export const defaultPosPaymentMethodSeeds: readonly PosPaymentMethodSeed[] = [
    {
        seedKey: "pos-pm-cash",
        name: "Cash",
        type: "cash",
        sequence: 1,
        terminalEnabled: false,
        cashQuickAmounts: "5,10,20,50",
    },
    {
        seedKey: "pos-pm-card",
        name: "Card",
        type: "card",
        sequence: 2,
        // Hook: terminalEnabled → type card; terminalEnabled false + type card → cash.
        // Provider stays `manual` — no host / terminalId / secrets.
        terminalEnabled: true,
    },
];

export type CreatePosPaymentMethodsResult = {
    bySeedKey: Record<string, HydratedDocument<IPosPaymentMethod>>;
    byName: Record<string, HydratedDocument<IPosPaymentMethod>>;
};

/**
 * Seeds Cash + Card. No terminal secrets. Idempotent on `{company, name}`.
 */
export async function createPosPaymentMethods(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<CreatePosPaymentMethodsResult> {
    const logger = getLogger("mongoDbInitialization-createPosPaymentMethods", parentLogger);
    logger.start("Creating POS payment methods...");

    const bySeedKey: Record<string, HydratedDocument<IPosPaymentMethod>> = {};
    const byName: Record<string, HydratedDocument<IPosPaymentMethod>> = {};

    for (const seed of defaultPosPaymentMethodSeeds) {
        try {
            const payload = {
                name: seed.name,
                type: seed.type,
                isActive: true,
                sequence: seed.sequence,
                ...(seed.cashQuickAmounts ? {cashQuickAmounts: seed.cashQuickAmounts} : {}),
                terminalEnabled: seed.terminalEnabled,
                terminalProvider: "manual" as const,
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await PosPaymentMethod.findOne({company: company._id, name: seed.name});
            if (!doc) {
                doc = await PosPaymentMethod.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySeedKey[seed.seedKey] = doc;
            byName[seed.name] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating POS payment method '${seed.seedKey}': ${message}`);
        }
    }

    logger.finish("Finished creating POS payment methods!", Object.keys(bySeedKey).length);
    return {bySeedKey, byName};
}
