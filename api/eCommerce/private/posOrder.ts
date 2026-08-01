import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posOrderToDTO, posOrdersToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posOrdersToSelect} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.select";
import {z} from "zod";

export const basePath = "/api/eCommerce/posOrder";
/**
 * POS orders are created by the till pay API only. Panel is read +
 * reprint — no CRUD create/edit.
 */
export const {router} = createCrudRouter({
    collectionName: "posOrders",
    model: PosOrder,
    service: posOrderService,
    entityName: "PosOrder",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: posOrderToDTO,
    toDTOArray: posOrdersToDTO,
    toSelect: posOrdersToSelect,
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 10, delete: 10},
});
