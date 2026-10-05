import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {PosConfig, PosConfigManagerUser} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {WarehouseSimple} from "armonia/src/modules/eCommerce/dto/warehouse.dto";
import type {FiscalConfigSimple} from "armonia/src/modules/eCommerce/dto/fiscalConfig.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {FiscalConfigSimpleSnippet} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.snippets";
import {PosConfigManagerUserSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {hasAnyManagerPin as configHasAnyManagerPin, userRefId} from "@eCommerceModule/utilities/services/posManagerPin";

export type PosConfigDtoOptions = {
    actionUserId?: string | null;
    /** When true, DTO `isPaused` is true even if this config has no pausedAt. */
    companyLockActive?: boolean;
    companyPauseReason?: string | null;
};

export function posConfigToDTO(config: IPosConfig, opts: PosConfigDtoOptions = {}): PosConfig {

    const pinsByUser = new Map((config.managerPins ?? []).map((p) => [userRefId(p.user), p] as const).filter(([id]) => !!id));
    const actionUserId = opts.actionUserId ? String(opts.actionUserId) : "";
    const managerIds = config?.managers?.map((m) => m._id.toString())?.filter(Boolean) || [];

    const currentUserIsManager = !!actionUserId && managerIds?.includes(actionUserId);
    const currentUserHasManagerPin = currentUserIsManager && !!pinsByUser.get(actionUserId)?.pinHash;
    const configPaused = !!config.pausedAt;
    const companyPaused = !!opts.companyLockActive;

    return {
        _id: config._id.toString(),
        name: config.name,
        paymentMethods: config.paymentMethods?.map((m) => ({
            _id: m._id.toString(),
            name: m.name ?? "",
            type: m.type,
            isActive: m.isActive,
            cashQuickAmounts: m.cashQuickAmounts,
            terminalEnabled: m.terminalEnabled,
            terminalProvider: m.terminalProvider,
            terminalProtocol: m.terminalProtocol,
            terminalHost: m.terminalHost,
            terminalPort: m.terminalPort,
            terminalId: m.terminalId,
            terminalPath: m.terminalPath,
        })) ?? [],
        managers: config.managers
            ?.map((m) => {
                const user = mapSnippet<PosConfigManagerUser>()(m, PosConfigManagerUserSnippet);
                if (!user) return null;
                return {
                    ...user,
                    hasPin: !!pinsByUser.get(user._id)?.pinHash,
                };
            })
            .filter((m): m is NonNullable<typeof m> => !!m),
        warehouses: config.warehouses
            ?.map((warehouse) => mapSnippet<WarehouseSimple>()(warehouse, WarehouseSimpleSnippet))
            .filter((w): w is WarehouseSimple => !!w) ?? [],
        currency: mapSnippet<CurrencySimple>()(config.currency, CurrencySimpleSnippet),
        fiscalConfig: mapSnippet<FiscalConfigSimple>()(config.fiscalConfig, FiscalConfigSimpleSnippet),
        receiptHeader: config.receiptHeader,
        receiptFooter: config.receiptFooter,
        ifaceBarcodeScanner: config.ifaceBarcodeScanner,
        ifaceCashControl: config.ifaceCashControl,
        allowDiscount: config.allowDiscount,
        allowQuantityChange: config.allowQuantityChange,
        allowOversell: !!config.allowOversell,
        pinForDiscount: !!config.pinForDiscount,
        pinForCashOut: !!config.pinForCashOut,
        pinForRefund: !!config.pinForRefund,
        hasManagerPin: configHasAnyManagerPin(config),
        currentUserIsManager,
        currentUserHasManagerPin,
        isActive: config.isActive,
        isPaused: configPaused || companyPaused,
        isCompanyPaused: companyPaused,
        companyPauseReason: companyPaused ? (opts.companyPauseReason ?? null) : null,
        pausedAt: config.pausedAt ? new Date(config.pausedAt).toISOString() : null,
        pausedBy: mapSnippet<SimpleBlankUser>()(config.pausedBy, SimpleBlankUserSnippet) ?? null,
        pauseReason: config.pauseReason ?? null,
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
        ...mapLifeCycleToDTO(config),
    };
}

export function posConfigsToDTO(configs: IPosConfig[], opts: PosConfigDtoOptions = {}): PosConfig[] {
    return configs.map((c) => posConfigToDTO(c, opts));
}
