import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {z} from "zod";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {PosOrderActions} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posOrderToDTO, posOrdersToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posOrdersToSelect} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.select";

export const basePath = "/api/eCommerce/posOrder";
/**
 * POS orders are created by till actions (hold / pay / refund).
 * Panel is read + reprint — no CRUD create, edit, or delete.
 */
export const {router} = createCrudRouter({
    collectionName: "posOrders",
    model: PosOrder,
    service: posOrderService,
    entityName: "PosOrder",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: () => z.object({}),
    editSchema: () => z.object({_id: z.string()}),
    toDTO: posOrderToDTO,
    toDTOArray: posOrdersToDTO,
    toSelect: posOrdersToSelect,
    buildCreateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    buildUpdateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    beforeDelete: async (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    rateLimits: {read: 60, write: 10, delete: 10},
    actions: PosOrderActions,
});
