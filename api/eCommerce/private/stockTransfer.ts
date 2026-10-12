import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {StockTransferSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.schema-def";
import {createStockTransferFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/createStockTransfer.form.validator";
import {editStockTransferFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/editStockTransfer.form.validator";
import StockTransfer from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import {stockTransferService} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer.service";
import {StockTransferActions} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer.actions";
import {stockTransferToDTO, stockTransfersToDTO} from "@eCommerceModule/utilities/mappers/stockTransfer/stockTransferMapper.dto";
import {stockTransfersToSelect} from "@eCommerceModule/utilities/mappers/stockTransfer/stockTransferMapper.select";
import {assertStockDocumentLines, type StockDocumentLine} from "@eCommerceModule/utilities/services/stockDocumentLines";

const buildTransferCreate = buildCreateDataFromSchemaDef(StockTransferSchemaDef);
const buildTransferUpdate = buildUpdateDataFromSchemaDef(StockTransferSchemaDef);

/** Two different warehouses of this company, and lines of distinct stock-tracked items. */
async function assertTransferable(
    transfer: {fromWarehouse: unknown; toWarehouse: unknown; lines: StockDocumentLine[]},
    params: Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode">,
): Promise<void> {
    if (String(nestedEntityToRef(transfer.fromWarehouse)) === String(nestedEntityToRef(transfer.toWarehouse))) {
        throw apiValidationException("stock_transfer_same_warehouse", "toWarehouse", null, params.languageCode);
    }
    await assertStockDocumentLines(transfer.lines, [transfer.fromWarehouse, transfer.toWarehouse], params);
}

export const basePath = "/api/eCommerce/stockTransfer";
export const {router} = createCrudRouter({
    collectionName: "stockTransfers",
    model: StockTransfer,
    service: stockTransferService,
    entityName: "StockTransfer",
    defaultSort: {createdAt: -1},
    createSchema: createStockTransferFormSchema,
    editSchema: editStockTransferFormSchema,
    toDTO: stockTransferToDTO,
    toDTOArray: stockTransfersToDTO,
    toSelect: stockTransfersToSelect,
    actions: StockTransferActions,
    buildCreateData: async (params) => {
        const data = buildTransferCreate(params);
        await assertTransferable({fromWarehouse: data.fromWarehouse, toWarehouse: data.toWarehouse, lines: data.lines}, params);
        return data;
    },
    /** Only a draft can change; a done transfer is ledger. */
    buildUpdateData: async (params, writeFields) => {
        const {existing, languageCode} = params;
        if (existing.status !== "draft") {
            throw apiValidationException("stock_document_not_draft", "", null, languageCode);
        }
        const data = buildTransferUpdate(params, writeFields);
        await assertTransferable(
            {
                fromWarehouse: data.fromWarehouse ?? existing.fromWarehouse,
                toWarehouse: data.toWarehouse ?? existing.toWarehouse,
                lines: data.lines ?? existing.lines,
            },
            params,
        );
        return data;
    },
    beforeDelete: async (params, doc) => {
        if (doc.status === "done") {
            throw apiValidationException("stock_document_done", "", null, params.languageCode);
        }
        // Keep the default relation check that a custom beforeDelete replaces
        await assertCanDelete(StockTransfer.modelName, doc._id, params.languageCode, params.session);
    },
    rateLimits: {read: 60, write: 30, delete: 10},
});
