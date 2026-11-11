import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {PosSessionActions} from "@eCommerceModule/database/schemas/posSession/posSession.actions";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posSessionToDTO, posSessionsToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posSessionsToSelect} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.select";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posOrdersToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posSessionListFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSessionList.form.validator";
import {recentWhenFilter} from "@eCommerceModule/utilities/services/recentWhenFilter";

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
    // Newest opening first (UX-12).
    defaultSort: {openedAt: -1, createdAt: -1},
    listSchema: posSessionListFormSchema,
    // "When" quick filter (validated by the list schema) as a range on the company's calendar.
    extraListFilter: (params) => recentWhenFilter(params.when, params.company._id, "openedAt"),
    createSchema: validateSingleForm,
    editSchema: validateSingleForm,
    toDTO: posSessionToDTO,
    toDTOArray: posSessionsToDTO,
    toSelect: posSessionsToSelect,
    enrichSingle: async (doc, params) => {
        const dto = posSessionToDTO(doc);
        const orders = await posOrderService.find(
            {session: doc._id, company: params.company._id},
            {logger: params.logger, languageCode: params.languageCode},
            // The currency lets each sale read "€12.50" in the list (UX-07).
            ["session", "config", "cashier", "customer", "productOrder", "currency"],
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
