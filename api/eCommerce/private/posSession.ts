import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posSessionToDTO, posSessionsToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posSessionsToSelect} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.select";
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
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 10, delete: 10},
});
