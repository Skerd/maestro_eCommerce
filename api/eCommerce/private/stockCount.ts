import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {StockCountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/stockCount.schema-def";
import {createStockCountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/createStockCount.form.validator";
import {editStockCountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/editStockCount.form.validator";
import StockCount from "@eCommerceModule/database/schemas/stockCount/stockCount";
import {stockCountService} from "@eCommerceModule/database/schemas/stockCount/stockCount.service";
import {StockCountActions} from "@eCommerceModule/database/schemas/stockCount/stockCount.actions";
import {stockCountToDTO, stockCountsToDTO} from "@eCommerceModule/utilities/mappers/stockCount/stockCountMapper.dto";
import {stockCountsToSelect} from "@eCommerceModule/utilities/mappers/stockCount/stockCountMapper.select";

const buildCountCreate = buildCreateDataFromSchemaDef(StockCountSchemaDef);
const buildCountUpdate = buildUpdateDataFromSchemaDef(StockCountSchemaDef);

export const basePath = "/api/eCommerce/stockCount";
export const {router} = createCrudRouter({
    collectionName: "stockCounts",
    model: StockCount,
    service: stockCountService,
    entityName: "StockCount",
    defaultSort: {createdAt: -1},
    createSchema: createStockCountFormSchema,
    editSchema: editStockCountFormSchema,
    toDTO: stockCountToDTO,
    toDTOArray: stockCountsToDTO,
    toSelect: stockCountsToSelect,
    actions: StockCountActions,
    buildCreateData: async (params) => {
        const data = buildCountCreate(params);
        data.lines = await stockCountService.countLines(data.warehouse, data.lines, [], params);
        return data;
    },
    /** Only a draft can change, and it stays a count of the same warehouse. */
    buildUpdateData: async (params, writeFields) => {
        const {existing, languageCode} = params;
        if (existing.status !== "draft") {
            throw apiValidationException("stock_document_not_draft", "", null, languageCode);
        }
        const data = buildCountUpdate(params, writeFields);
        delete data.warehouse;
        if (data.lines) data.lines = await stockCountService.countLines(existing.warehouse, data.lines, existing.lines, params);
        return data;
    },
    beforeDelete: async (params, doc) => {
        if (doc.status === "applied") {
            throw apiValidationException("stock_document_done", "", null, params.languageCode);
        }
        // Keep the default relation check that a custom beforeDelete replaces
        await assertCanDelete(StockCount.modelName, doc._id, params.languageCode, params.session);
    },
    rateLimits: {read: 60, write: 30, delete: 10},
});
