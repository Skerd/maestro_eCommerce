import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {UserContext} from "@coreModule/utilities/types/types";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {
    assertStockDocumentLines,
    recordStockMovement,
    requireRef,
} from "@eCommerceModule/utilities/services/stockDocumentLines";
import StockTransferModel from "./stockTransfer";
import {stockTransferService} from "./stockTransfer.service";

/** Completing or cancelling moves the transfer's status, so both need `stocktransfers[write:status]`. */
function assertStatusWrite(params: {languageCode: string; actionUserCtx: UserContext}): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        StockTransferModel,
        getModelCollectedData("stockTransfers").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.status) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

async function loadDraft(params: TransactionRequiredParams & {_id: string}) {
    const {session, logger, languageCode, company, _id} = params;
    const transfer = await stockTransferService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode, withDeleted: false},
    );
    if (transfer.status !== "draft") {
        throw apiValidationException("stock_document_not_draft", "", null, languageCode);
    }
    return transfer;
}

export class StockTransferActions {
    /**
     * Moves every line: free stock leaves the source warehouse (held units
     * never move; a short line refuses the whole transfer with
     * `insufficient_stock`) and arrives in the destination, whose row is created
     * when it never stocked the item.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async complete(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx} = params;
        assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const transfer = await loadDraft(params);
        const from = requireRef(transfer.fromWarehouse, languageCode);
        const to = requireRef(transfer.toWarehouse, languageCode);
        // Products or warehouses may have changed since the draft was saved
        await assertStockDocumentLines(transfer.lines, [from, to], params);

        const reference = {type: "StockTransfer" as const, id: new ObjectId(transfer._id.toString()), performedBy: actionUserCtx.userId};
        for (const line of transfer.lines) {
            const product = requireRef(line.product, languageCode);
            const variant = nestedEntityToRef(line.variant);
            const out = await inventoryService.takeStock({product, variant, warehouse: from, company: company._id}, line.quantity, false, ctx);
            if (!out) throw apiValidationException("insufficient_stock", "lines", null, languageCode);
            await recordStockMovement(out, -line.quantity, "transfer_out", reference, ctx);

            const into = await inventoryService.addStock({product, variant, warehouse: to, company: company._id}, line.quantity, ctx);
            await recordStockMovement(into, line.quantity, "transfer_in", reference, ctx);
        }

        await stockTransferService.updateByIdOrThrow(
            transfer._id,
            {$set: {status: "done", doneAt: new Date(), doneBy: new ObjectId(actionUserCtx.userId)}},
            ctx,
        );
        return {message: "Stock transfer completed"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async cancel(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, actionUserCtx} = params;
        assertStatusWrite(params);

        const transfer = await loadDraft(params);
        await stockTransferService.updateByIdOrThrow(
            transfer._id,
            {$set: {status: "cancelled"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
        return {message: "Stock transfer cancelled"};
    }
}
