import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {z} from "zod";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {PosSessionActions} from "@eCommerceModule/database/schemas/posSession/posSession.actions";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posSessionToDTO, posSessionsToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posSessionsToSelect} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.select";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posOrdersToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";

export const basePath = "/api/eCommerce/posSession";
/**
 * POS sessions are opened and closed by till actions.
 * Panel is read-only — no CRUD create, edit, or delete.
 */
export const {router} = createCrudRouter({
    collectionName: "posSessions",
    model: PosSession,
    service: posSessionService,
    entityName: "PosSession",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: () => z.object({}),
    editSchema: () => z.object({_id: z.string()}),
    toDTO: posSessionToDTO,
    toDTOArray: posSessionsToDTO,
    toSelect: posSessionsToSelect,
    enrichSingle: async (doc, params) => {
        const dto = posSessionToDTO(doc);
        const orders = await posOrderService.find(
            {session: doc._id, company: params.company._id},
            {logger: params.logger, languageCode: params.languageCode},
            ["session", "config", "cashier", "customer", "productOrder"],
            undefined,
            {createdAt: -1},
            50,
        );
        dto.posOrders = posOrdersToDTO(orders);
        return dto;
    },
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
    actions: PosSessionActions,
});
