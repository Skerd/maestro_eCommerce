import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";

/** Resolve warehouse ObjectIds from a POS config (supports legacy `warehouse`). */
export function warehouseIdsFromPosConfig(config: {
    warehouses?: unknown;
    warehouse?: unknown;
}): ObjectId[] {
    const fromArray = Array.isArray(config.warehouses) ? config.warehouses : [];
    const ids = fromArray
        .map((warehouse) => nestedEntityToRef(warehouse))
        .filter((id): id is ObjectId => !!id);
    if (ids.length) return ids;

    const single = nestedEntityToRef(config.warehouse);
    return single ? [single] : [];
}

/**
 * Blocks when this warehouse is the only warehouse on any POS config.
 * Otherwise removes it from every POS config that still keeps ≥1 other warehouse.
 */
export async function detachWarehouseFromPosConfigsOrThrow(params: {
    warehouseId: ObjectId;
    companyId: ObjectId;
    languageCode: string;
    session?: ClientSession | null;
}): Promise<void> {
    const {warehouseId, companyId, languageCode, session} = params;

    const configs = await posConfigService.find({
        company: companyId,
        $or: [{warehouses: warehouseId}, {warehouse: warehouseId}],
    }, {session: session ?? undefined, withDeleted: false}, undefined, "warehouses warehouse");

    if (!configs.length) return;

    for (const config of configs) {
        const remaining = warehouseIdsFromPosConfig(config).filter((id) => !id.equals(warehouseId));
        if (remaining.length === 0) {
            throw apiValidationException("warehouse_in_use_by_pos_config", null, null, languageCode);
        }
    }

    const opts = {session: session ?? undefined, withDeleted: false};
    await posConfigService.updateMany(
        {company: companyId, warehouses: warehouseId},
        {$pull: {warehouses: warehouseId}},
        opts,
    );
    await posConfigService.updateMany(
        {company: companyId, warehouse: warehouseId},
        {$unset: {warehouse: ""}},
        opts,
    );
}
