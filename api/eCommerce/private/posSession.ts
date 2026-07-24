import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PosSessionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.schema-def";
import {createPosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/createPosSession.form.validator";
import {editPosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/editPosSession.form.validator";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posSessionToDTO, posSessionsToDTO, posSessionsToSelect} from "@eCommerceModule/utilities/mappers/posSessionMapper.dto";

const buildPosSessionCreateFromSchemaDef = buildCreateDataFromSchemaDef(PosSessionSchemaDef);
const buildPosSessionUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(PosSessionSchemaDef);

export const basePath = "/api/eCommerce/posSession";
export const {router} = createCrudRouter({
    collectionName: "posSessions",
    model: PosSession,
    service: posSessionService,
    entityName: "PosSession",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: createPosSessionFormSchema,
    editSchema: editPosSessionFormSchema,
    toDTO: posSessionToDTO,
    toDTOArray: posSessionsToDTO,
    toSelect: posSessionsToSelect,
    buildCreateData: async (params) => {
        const data = buildPosSessionCreateFromSchemaDef(params);
        const openingBalance = Number(data.openingBalance ?? 0);
        data.name = `POS/${Date.now()}`;
        data.state = "opening_control";
        data.openingBalance = openingBalance;
        data.expectedCash = openingBalance;
        data.cashRegisterBalance = openingBalance;
        data.orderCount = 0;
        data.totalSales = 0;
        data.totalCash = 0;
        data.totalCard = 0;
        data.cashMoves = [];
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        // Edit form is notes-only; still allow SchemaDef fields if sent with write access.
        return buildPosSessionUpdateFromSchemaDef(params, writeFields);
    },
    rateLimits: {read: 60, write: 30, delete: 10},
});
