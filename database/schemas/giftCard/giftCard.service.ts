import {randomBytes} from "crypto";
import {ObjectId} from "mongodb";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import type {CrudOptions} from "@coreModule/database/services";
import GiftCard, {IGiftCard} from "@eCommerceModule/database/schemas/giftCard/giftCard";

/** Unambiguous alphabet (no 0/O/1/I) for human-typed codes. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(length: number): string {
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) {
        out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return out;
}

export function generateGiftCardCode(): string {
    return `GC-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}

export class GiftCardService extends BaseCrudService<IGiftCard, typeof GiftCard> {
    constructor() {
        super(GiftCard, "GiftCard");
    }

    /** A redeemable card: active, not expired, positive balance. */
    async findRedeemable(code: string, companyId: ObjectId, opts: CrudOptions): Promise<IGiftCard | null> {
        return GiftCard.findOne({
            company: companyId,
            code: code.trim().toUpperCase(),
            status: "active",
            balance: {$gt: 0},
            deletedAt: null,
            $or: [{expiresAt: null}, {expiresAt: {$gt: new Date()}}],
        }).session(opts.session ?? null);
    }

    /**
     * Returns credit to a card (refunds). Reactivates depleted cards but never
     * disabled ones — an admin disabled the code on purpose.
     */
    async recreditAmount(
        giftCardId: ObjectId,
        amount: number,
        opts: CrudOptions & {auditUserId?: ObjectId | string},
    ): Promise<IGiftCard | null> {
        const updated = await GiftCard.findOneAndUpdate(
            {_id: giftCardId, status: {$in: ["active", "depleted"]}},
            {$inc: {balance: amount}},
            {new: true, session: opts.session},
        );
        if (updated && updated.status === "depleted" && updated.balance > 0) {
            updated.status = "active";
            await updated.save({session: opts.session});
        }
        return updated;
    }

    /**
     * Atomically takes `amount` off the card's balance; returns null when the
     * balance no longer covers it (concurrent redemption). Flips status to
     * "depleted" when the balance reaches zero.
     */
    async redeemAmount(
        giftCardId: ObjectId,
        amount: number,
        opts: CrudOptions & {auditUserId?: ObjectId | string},
    ): Promise<IGiftCard | null> {
        const updated = await GiftCard.findOneAndUpdate(
            {_id: giftCardId, status: "active", balance: {$gte: amount}},
            {$inc: {balance: -amount}},
            {new: true, session: opts.session},
        );
        if (updated && updated.balance <= 0) {
            updated.status = "depleted";
            await updated.save({session: opts.session});
        }
        return updated;
    }
}

export const giftCardService = new GiftCardService();
