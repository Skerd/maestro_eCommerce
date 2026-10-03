import {ObjectId} from "mongodb";
import mongoose from "mongoose";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";

/**
 * Per-company, per-year order sequences. A raw collection (no schema, no
 * permissions) because it is internal bookkeeping nobody reads or edits.
 */
const SEQUENCE_COLLECTION = "ecommerceSequences";
const MONGO_DUPLICATE_KEY = 11000;

function sequences() {
    return mongoose.connection.collection<{_id: string; seq: number}>(SEQUENCE_COLLECTION);
}

/** Highest sequence already used by orders for this prefix (pre-counter data). */
async function highestExistingSequence(companyId: ObjectId, prefix: string): Promise<number> {
    const last = await ProductOrder.findOne(
        {company: companyId, orderNumber: {$regex: `^${prefix}\\d+$`}},
        {orderNumber: 1},
        {sort: {orderNumber: -1}},
    ).lean();
    const lastSeq = last?.orderNumber ? parseInt(last.orderNumber.slice(prefix.length), 10) : 0;
    return Number.isNaN(lastSeq) ? 0 : lastSeq;
}

/**
 * Atomic `ORD-{year}-{seq}` generator. Runs outside the caller's transaction on
 * purpose: concurrent checkouts never collide on the unique orderNumber index,
 * and an aborted order merely leaves a gap in the sequence.
 */
export async function generateOrderNumber(companyId: ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const key = `productOrder:${companyId.toString()}:${year}`;

    const existing = await sequences().findOne({_id: key}, {projection: {_id: 1}});
    if (!existing) {
        // First use: seed from orders created before the counter existed. $max keeps
        // concurrent seeders idempotent; a duplicate insert just means another won.
        const seed = await highestExistingSequence(companyId, prefix);
        try {
            await sequences().updateOne({_id: key}, {$max: {seq: seed}}, {upsert: true});
        } catch (e: any) {
            if (e?.code !== MONGO_DUPLICATE_KEY) throw e;
        }
    }

    const result = await sequences().findOneAndUpdate(
        {_id: key},
        {$inc: {seq: 1}},
        {upsert: true, returnDocument: "after"},
    );
    // mongodb driver ≥6 returns the document; older drivers wrap it in {value}.
    const doc: any = (result as any)?.value !== undefined ? (result as any).value : result;
    const sequence = doc?.seq ?? 1;

    return `${prefix}${String(sequence).padStart(6, "0")}`;
}
