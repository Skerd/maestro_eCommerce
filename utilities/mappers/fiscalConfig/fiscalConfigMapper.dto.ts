import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import type {FiscalConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

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
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
        ...mapLifeCycleToDTO(config),
    };
}

export function fiscalConfigsToDTO(configs: IFiscalConfig[]): FiscalConfig[] {
    return configs.map(fiscalConfigToDTO);
}
