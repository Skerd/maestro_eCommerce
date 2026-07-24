import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {PosConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function posConfigToDTO(config: IPosConfig): PosConfig {
    const warehouse = config.warehouse as any;
    const currency = config.currency as any;
    const paymentMethods = (config.paymentMethods as any[]) ?? [];

    return {
        _id: config._id.toString(),
        name: config.name,
        paymentMethods: paymentMethods.map((m: any) => m?._id?.toString?.() ?? m?.toString?.() ?? String(m)),
        paymentMethodLabels: paymentMethods
            .filter((m: any) => m?._id || m?.name)
            .map((m: any) => ({
                _id: m._id?.toString?.() ?? m.toString?.() ?? "",
                name: m.name ?? "",
                type: m.type,
                cashQuickAmounts: m.cashQuickAmounts,
                terminalEnabled: m.terminalEnabled,
                terminalProvider: m.terminalProvider,
                terminalHost: m.terminalHost,
                terminalPort: m.terminalPort,
                terminalId: m.terminalId,
                terminalPath: m.terminalPath,
            })),
        warehouse: warehouse?._id?.toString?.() ?? warehouse?.toString?.() ?? "",
        warehouseLabel: warehouse?._id
            ? {_id: warehouse._id.toString(), name: warehouse.name ?? ""}
            : undefined,
        currency: currency ? currency._id?.toString?.() ?? currency.toString?.() : undefined,
        currencyLabel: currency?._id
            ? {
                  _id: currency._id.toString(),
                  name: currency.name ?? "",
                  symbol: currency.symbol,
                  abbreviation: currency.abbreviation,
              }
            : undefined,
        receiptHeader: config.receiptHeader,
        receiptFooter: config.receiptFooter,
        ifaceBarcodeScanner: config.ifaceBarcodeScanner,
        ifaceCashControl: config.ifaceCashControl,
        allowDiscount: config.allowDiscount,
        allowQuantityChange: config.allowQuantityChange,
        allowOversell: !!(config as any).allowOversell,
        pinForDiscount: !!(config as any).pinForDiscount,
        pinForCashOut: !!(config as any).pinForCashOut,
        pinForRefund: !!(config as any).pinForRefund,
        hasManagerPin: !!(config as any).managerPinHash,
        isActive: config.isActive,
        company: mapCompanyLabel(config.company),
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
    };
}

export function posConfigsToDTO(configs: IPosConfig[]): PosConfig[] {
    return configs.map(posConfigToDTO);
}

export function posConfigToSelect(config: IPosConfig): ApiSelectDatum {
    return {value: config._id.toString(), label: config.name};
}

export function posConfigsToSelect(configs: IPosConfig[]): ApiSelectDatum[] {
    return configs.map(posConfigToSelect);
}
