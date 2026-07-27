import type {IPosConfig, IPosManagerPin} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {PosConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.dto";
import {mapPopulatedRef, mapPopulatedSimpleCurrency} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {hasAnyManagerPin as configHasAnyManagerPin} from "@eCommerceModule/utilities/services/posManagerPin";

export type PosConfigDtoOptions = {
    actionUserId?: string | null;
};

export function posConfigToDTO(config: IPosConfig, opts: PosConfigDtoOptions = {}): PosConfig {
    const warehousesRaw = (() => {
        const list = (config.warehouses as any[]) ?? [];
        if (list.length) return list;
        const legacy = (config as any).warehouse;
        return legacy ? [legacy] : [];
    })();

    const paymentMethods = (config.paymentMethods as any[]) ?? [];
    const managers = (config.managers as any[]) ?? [];
    const managerPins = ((config as any).managerPins as IPosManagerPin[] | undefined) ?? [];

    const pinsByUser = new Map(
        managerPins
            .map((p) => [(p.user as any).toString(), p] as const)
            .filter(([id]) => !!id),
    );

    const actionUserId = opts.actionUserId ? String(opts.actionUserId) : "";
    const managerIds = managers.map((m) => m._id.toString()).filter(Boolean);
    const currentUserIsManager = !!actionUserId && managerIds.includes(actionUserId);
    const currentUserHasManagerPin =
        currentUserIsManager && !!pinsByUser.get(actionUserId)?.pinHash;

    return {
        _id: config._id.toString(),
        name: config.name,
        paymentMethods: paymentMethods.map((m: any) => m._id.toString()),
        paymentMethodLabels: paymentMethods
            .filter((m: any) => m?._id || m?.name)
            // Till must not offer inactive or soft-deleted methods (admin still keeps IDs in paymentMethods).
            .filter((m: any) => {
                if (typeof m !== "object" || !("_id" in m)) return true;
                if (m.deletedAt) return false;
                if (m.isActive === false) return false;
                return true;
            })
            .map((m: any) => ({
                _id: m._id.toString(),
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
        managers: managers.map((m: any) => ({
            _id: m._id.toString(),
            name: m.name,
            surname: m.surname,
            username: m.username,
            hasPin: !!pinsByUser.get(m._id.toString())?.pinHash,
        })),
        warehouses: warehousesRaw
            .filter((w) => !!w)
            .map((warehouse: any) => ({
                _id: warehouse._id.toString(),
                name: warehouse.name ?? "",
                code: warehouse.code,
            })),
        currency: mapPopulatedSimpleCurrency(config.currency as any),
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
        company: mapPopulatedRef(config.company),
        ...mapSoftDeleteToDTO(config),
        ...mapOwnershipToDTO(config),
        ...mapLifeCycleToDTO(config),
    };
}

export function posConfigsToDTO(configs: IPosConfig[], opts: PosConfigDtoOptions = {}): PosConfig[] {
    return configs.map((c) => posConfigToDTO(c, opts));
}
