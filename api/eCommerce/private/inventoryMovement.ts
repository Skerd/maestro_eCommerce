import {ObjectId} from "mongodb";
import {z} from "zod";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {
    inventoryMovementToDTO,
    inventoryMovementsToDTO,
} from "@eCommerceModule/utilities/mappers/inventoryMovementMapper.dto";

function inventoryMovementListSchema(_languageCode: string) {
    return z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        productId: z.string().optional(),
        warehouseId: z.string().optional(),
        reason: z.string().optional(),
        inventoryId: z.string().optional(),
    });
}

export const basePath = "/api/eCommerce/inventoryMovement";

// Movements are system/action-generated; panel is read-only (list + single).
export const {router} = createCrudRouter({
    collectionName: "inventoryMovements",
    model: InventoryMovement,
    service: inventoryMovementService,
    entityName: "Inventory movement",
    defaultSort: {occurredAt: -1, createdAt: -1},
    listSchema: inventoryMovementListSchema,
    createSchema: () => z.object({}).passthrough() as any,
    editSchema: () => z.object({_id: z.string()}).passthrough() as any,
    toDTO: inventoryMovementToDTO,
    toDTOArray: inventoryMovementsToDTO,
    toSelect: (docs: any[]) =>
        docs.map((d: any) => ({
            value: d._id.toString(),
            label: `${d.reason} (${d.quantity})`,
        })),
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    beforeDelete: async () => {},
    extraListFilter: async ({productId, warehouseId, reason, inventoryId}) => {
        const filter: Record<string, unknown> = {};
        if (productId) filter.product = new ObjectId(productId as string);
        if (warehouseId) filter.warehouse = new ObjectId(warehouseId as string);
        if (reason) filter.reason = reason;
        if (inventoryId) {
            const id = new ObjectId(inventoryId as string);
            filter.$or = [{inventory: id}, {referenceType: "Inventory", referenceId: id}];
        }
        return filter;
    },
    rateLimits: {read: 120, write: 10, delete: 5},
});
