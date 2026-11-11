import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {
    inventoryMovementToDTO,
    inventoryMovementsToDTO,
} from "@eCommerceModule/utilities/mappers/inventoryMovement/inventoryMovementMapper.dto";
import {inventoryMovementsToSelect} from "@eCommerceModule/utilities/mappers/inventoryMovement/inventoryMovementMapper.select";
import {withShopCurrency} from "@eCommerceModule/utilities/services/shopCurrency";
import {inventoryMovementListFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovementList.form.validator";
import {recentWhenFilter} from "@eCommerceModule/utilities/services/recentWhenFilter";

export const basePath = "/api/eCommerce/inventoryMovement";

// Movements are system/action-generated; panel is read-only (list + single).
// List filters (incl. scoped inventory history) come from dslFilterMW.
export const {router} = createCrudRouter({
    collectionName: "inventoryMovements",
    model: InventoryMovement,
    service: inventoryMovementService,
    entityName: "Inventory movement",
    defaultSort: {occurredAt: -1, createdAt: -1},
    listSchema: inventoryMovementListFormSchema,
    // "When" quick filter (validated by the list schema) as a range on the company's calendar.
    extraListFilter: (params) => recentWhenFilter(params.when, params.company._id, "occurredAt"),
    createSchema: validateSingleForm,
    editSchema: validateSingleForm,
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
    // Unit costs are in the shop currency (UX-07).
    enrichList: (docs, params) => withShopCurrency(inventoryMovementsToDTO(docs), params.company._id, params.languageCode),
    enrichSingle: async (doc, params) => (await withShopCurrency([inventoryMovementToDTO(doc)], params.company._id, params.languageCode))[0],
});
