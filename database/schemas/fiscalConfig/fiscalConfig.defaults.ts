import type {HydratedDocument} from "mongoose";
import FiscalConfig, {type IFiscalConfig} from "./fiscalConfig";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";

export const FISCAL_CONFIG_NAME = demoName("Albania TEST Fiscalization");

/**
 * Albanian TEST fiscalization placeholder. Never writes certificate material.
 * Idempotent on `{company, name}`.
 */
export async function createFiscalConfigs(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<HydratedDocument<IFiscalConfig> | undefined> {
    const logger = getLogger("mongoDbInitialization-createFiscalConfigs", parentLogger);
    logger.start("Creating fiscal configs...");

    try {
        const payload = {
            name: FISCAL_CONFIG_NAME,
            nipt: "TEST-NIPT-000",
            softCode: "TEST-SOFT-000",
            maintainerCode: "TEST-MAINT-000",
            businessUnitCode: "TEST-BU-000",
            operatorCode: "TEST-OP-000",
            tcrCode: "TEST-TCR-000",
            tcrIntId: "1",
            tcrType: "REGULAR" as const,
            fiscalizationUrl: "https://fiscal.test.local/fiscalize",
            einvoiceUrl: "https://fiscal.test.local/einvoice",
            selfcareUrl: "https://fiscal.test.local/selfcare",
            proxyUrl: "https://fiscal.test.local/proxy",
            sellerName: "Demo TEST",
            sellerAddress: "Myslym Shyr",
            sellerTown: "Tirana",
            sellerCountry: "ALB",
            isVatRegistered: true,
            environment: "test" as const,
            isActive: false,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await FiscalConfig.findOne({company: company._id, name: FISCAL_CONFIG_NAME});
        if (!doc) {
            doc = await FiscalConfig.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating fiscal configs!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating fiscal config: ${message}`);
        logger.fail("Failed to create fiscal configs!");
        return undefined;
    }
}
