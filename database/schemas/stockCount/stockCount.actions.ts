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
import {recordStockMovement, requireRef} from "@eCommerceModule/utilities/services/stockDocumentLines";
import StockCountModel from "./stockCount";
import {stockCountService} from "./stockCount.service";

/** Applying or cancelling moves the count's status, so both need `stockcounts[write:status]`. */
function assertStatusWrite(params: {languageCode: string; actionUserCtx: UserContext}): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        StockCountModel,
        getModelCollectedData("stockCounts").writeFields!,
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
    const count = await stockCountService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode, withDeleted: false},
    );
    if (count.status !== "draft") {
        throw apiValidationException("stock_document_not_draft", "", null, languageCode);
    }
    return count;
}

export class StockCountActions {
    /**
     * Sets on-hand to what was counted, for every line with a count (lines
     * left blank weren't counted and stay as they are). The difference is taken
     * against on-hand now, not the snapshot, so sales shipped while counting
     * aren't undone. Each change gets an `adjustment` movement. A count below
     * what is held for orders is accepted: the shelf is what it is, and the
     * shortfall shows as negative availability.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async apply(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx} = params;
        assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const count = await loadDraft(params);
        const warehouse = requireRef(count.warehouse, languageCode);
        const reference = {type: "StockCount" as const, id: new ObjectId(count._id.toString()), performedBy: actionUserCtx.userId};

        for (const line of count.lines) {
            if (line.countedQuantity == null) continue;
            const product = requireRef(line.product, languageCode);
            const variant = nestedEntityToRef(line.variant);
            const row = await inventoryService.findOne(
                {product, variant: variant ?? null, warehouse, company: company._id},
                {...ctx, withDeleted: false},
            );
            const delta = line.countedQuantity - (row?.quantityOnHand ?? 0);
            if (delta === 0) continue;

            const updated = delta > 0
                ? await inventoryService.addStock({product, variant, warehouse, company: company._id}, delta, ctx)
                : await inventoryService.adjust(product, variant, warehouse, delta, ctx);
            if (!updated) throw apiValidationException("inventory_not_found", "lines", null, languageCode);
            await recordStockMovement(updated, delta, "adjustment", reference, ctx);
        }

        await stockCountService.updateByIdOrThrow(
            count._id,
            {$set: {status: "applied", appliedAt: new Date(), appliedBy: new ObjectId(actionUserCtx.userId)}},
            ctx,
        );
        return {message: "Stock count applied"};
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

        const count = await loadDraft(params);
        await stockCountService.updateByIdOrThrow(
            count._id,
            {$set: {status: "cancelled"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
        return {message: "Stock count cancelled"};
    }
}
