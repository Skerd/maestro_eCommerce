import {z} from "zod";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {
    inventoryMovementToDTO,
    inventoryMovementsToDTO,
} from "@eCommerceModule/utilities/mappers/inventoryMovement/inventoryMovementMapper.dto";
import {inventoryMovementsToSelect} from "@eCommerceModule/utilities/mappers/inventoryMovement/inventoryMovementMapper.select";

export const basePath = "/api/eCommerce/inventoryMovement";

// Movements are system/action-generated; panel is read-only (list + single).
// List filters (incl. scoped inventory history) come from dslFilterMW.
export const {router} = createCrudRouter({
    collectionName: "inventoryMovements",
    model: InventoryMovement,
    service: inventoryMovementService,
    entityName: "Inventory movement",
    defaultSort: {occurredAt: -1, createdAt: -1},
    createSchema: () => z.looseObject({}),
    editSchema: () => z.looseObject({}),
    toDTO: inventoryMovementToDTO,
    toDTOArray: inventoryMovementsToDTO,
    toSelect: inventoryMovementsToSelect,
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    beforeDelete: async () => {},
    rateLimits: {read: 120, write: 10, delete: 5},
});
