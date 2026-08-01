import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {PosConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.dto";
import {
    mapPopulatedRef,
    mapPopulatedSimpleCurrency,
    mapPopulatedSimpleUser,
} from "@coreModule/utilities/mappers/common.mapper";
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
        })),
        managers: config.managers?.map((m) => ({
            _id: m._id.toString(),
            name: m.name,
            surname: m.surname,
            username: m.username,
            hasPin: !!pinsByUser.get(m._id.toString())?.pinHash,
        })),
        warehouses: config.warehouses?.map((warehouse) => ({
            _id: warehouse._id.toString(),
            name: mapPopulatedRef(warehouse)?.name ?? warehouse.name ?? "",
            code: warehouse.code,
        })),
        currency: mapPopulatedSimpleCurrency(config.currency),
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
        pausedBy: mapPopulatedSimpleUser(config.pausedBy as any) ?? null,
        pauseReason: config.pauseReason ?? null,
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
        ...mapLifeCycleToDTO(config),
    };
}

export function posConfigsToDTO(configs: IPosConfig[], opts: PosConfigDtoOptions = {}): PosConfig[] {
    return configs.map((c) => posConfigToDTO(c, opts));
}
