import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import type {FiscalConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function fiscalConfigToDTO(config: IFiscalConfig): FiscalConfig {
    return {
        _id: config._id.toString(),
        name: config.name,
        nipt: config.nipt,
        softCode: config.softCode,
        maintainerCode: config.maintainerCode,
        businessUnitCode: config.businessUnitCode,
        operatorCode: config.operatorCode,
        tcrCode: config.tcrCode,
        tcrIntId: config.tcrIntId,
        tcrType: (config.tcrType as "REGULAR" | "VENDING") || "REGULAR",
        fiscalizationUrl: config.fiscalizationUrl,
        einvoiceUrl: config.einvoiceUrl,
        selfcareUrl: config.selfcareUrl,
        proxyUrl: config.proxyUrl,
        sellerName: config.sellerName,
        sellerAddress: config.sellerAddress,
        sellerTown: config.sellerTown,
        sellerCountry: config.sellerCountry,
        isVatRegistered: !!config.isVatRegistered,
        autoFiscalizePos: !!config.autoFiscalizePos,
        autoEinvoice: !!config.autoEinvoice,
        environment: (config.environment as "test" | "production") || "test",
        hasCertificate: !!config.hasCertificate,
        isActive: !!config.isActive,
        company: mapCompanyLabel(config.company),
        createdAt:
            (config as any).createdAt instanceof Date
                ? (config as any).createdAt.toISOString()
                : (config as any).createdAt,
        updatedAt:
            (config as any).updatedAt instanceof Date
                ? (config as any).updatedAt.toISOString()
                : (config as any).updatedAt,
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
    };
}

export function fiscalConfigsToDTO(configs: IFiscalConfig[]): FiscalConfig[] {
    return configs.map(fiscalConfigToDTO);
}

export function fiscalConfigToSelect(config: IFiscalConfig): ApiSelectDatum {
    return {value: config._id.toString(), label: config.name};
}

export function fiscalConfigsToSelect(configs: IFiscalConfig[]): ApiSelectDatum[] {
    return configs.map(fiscalConfigToSelect);
}
