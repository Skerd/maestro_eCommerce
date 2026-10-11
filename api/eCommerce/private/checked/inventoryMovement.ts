import {z} from "zod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
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
    createSchema: () => z.object({}),
    editSchema: () => z.object({_id: z.string()}),
    toDTO: inventoryMovementToDTO,
    toDTOArray: inventoryMovementsToDTO,
    toSelect: inventoryMovementsToSelect,
    buildCreateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    buildUpdateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    beforeDelete: async (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    rateLimits: {read: 120, write: 10, delete: 5},
});
