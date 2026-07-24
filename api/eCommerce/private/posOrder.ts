import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {createPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/createPosOrder.form.validator";
import {editPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/editPosOrder.form.validator";
import {posOrderToDTO, posOrdersToDTO, posOrdersToSelect} from "@eCommerceModule/utilities/mappers/posOrderMapper.dto";

export const basePath = "/api/eCommerce/posOrder";
export const {router} = createCrudRouter({
    collectionName: "posOrders",
    model: PosOrder,
    service: posOrderService,
    entityName: "PosOrder",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: createPosOrderFormSchema,
    editSchema: editPosOrderFormSchema,
    toDTO: posOrderToDTO,
    toDTOArray: posOrdersToDTO,
    toSelect: posOrdersToSelect,
    // Till API creates/pays orders — standard CRUD create/update are stubs.
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 10, delete: 10},
});
