import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import type {FiscalConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.dto";
import {mapMedia} from "@coreModule/utilities/mappers/common.mapper";
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
        environment: (config.environment as "test" | "production") || "test",
        certificate: config.certificate?.flatMap(item => {
            const media = mapMedia(item);
            return media ? [media] : [];
        }),
        certificatePassword: !!config.certificatePassword,
        isActive: !!config.isActive,
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
        ...mapLifeCycleToDTO(config),
    };
}

export function fiscalConfigsToDTO(configs: IFiscalConfig[]): FiscalConfig[] {
    return configs.map(fiscalConfigToDTO);
}
