import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posSessionToDTO, posSessionsToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posSessionsToSelect} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.select";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posOrdersToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {z} from "zod";

export const basePath = "/api/eCommerce/posSession";
/**
 * POS sessions are opened/closed by the till API only. Panel is read-only.
 */
export const {router} = createCrudRouter({
    collectionName: "posSessions",
    model: PosSession,
    service: posSessionService,
    entityName: "PosSession",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: posSessionToDTO,
    toDTOArray: posSessionsToDTO,
    toSelect: posSessionsToSelect,
    enrichSingle: async (doc, params) => {
        const dto = posSessionToDTO(doc);
        const orders = await posOrderService.find(
            {session: doc._id, company: params.company._id},
            {session: params.session, logger: params.logger, languageCode: params.languageCode},
            ["session", "config", "cashier", "customer", "productOrder"],
            undefined,
            {createdAt: -1},
            50,
        );
        dto.posOrders = posOrdersToDTO(orders);
        return dto;
    },
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 10, delete: 10},
});
