import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";

/** Resolve warehouse ObjectIds from a POS config (supports legacy `warehouse`). */
export function warehouseIdsFromPosConfig(config: {
    warehouses?: unknown;
    warehouse?: unknown;
}): ObjectId[] {
    const fromArray = Array.isArray(config.warehouses) ? config.warehouses : [];
    const ids = fromArray
        .map((w: any) => {
            const raw = w?._id ?? w;
            if (!raw) return null;
            return raw instanceof ObjectId ? raw : new ObjectId(String(raw));
        })
        .filter((id): id is ObjectId => !!id);
    if (ids.length) return ids;

    const single = (config as any).warehouse?._id ?? (config as any).warehouse;
    if (!single) return [];
    return [single instanceof ObjectId ? single : new ObjectId(String(single))];
}

/**
 * Blocks when this warehouse is the only warehouse on any POS config.
 * Otherwise removes it from every POS config that still keeps ≥1 other warehouse.
 */
export async function detachWarehouseFromPosConfigsOrThrow(params: {
    warehouseId: ObjectId;
    companyId: ObjectId;
    languageCode: string;
    session?: any;
}): Promise<void> {
    const {warehouseId, companyId, languageCode, session} = params;

    const configs = await PosConfig.find({
        company: companyId,
        deletedAt: null,
        $or: [{warehouses: warehouseId}, {warehouse: warehouseId}],
    })
        .select({warehouses: 1, warehouse: 1})
        .session(session ?? null)
        .lean();

    if (!configs.length) return;

    for (const config of configs) {
        const remaining = warehouseIdsFromPosConfig(config).filter((id) => !id.equals(warehouseId));
        if (remaining.length === 0) {
            throw apiValidationException("warehouse_in_use_by_pos_config", null, null, languageCode);
        }
    }

    const opts = session ? {session} : {};
    await PosConfig.updateMany(
        {company: companyId, deletedAt: null, warehouses: warehouseId},
        {$pull: {warehouses: warehouseId}},
        opts,
    );
    await PosConfig.updateMany(
        {company: companyId, deletedAt: null, warehouse: warehouseId},
        {$unset: {warehouse: ""}},
        opts,
    );
}
