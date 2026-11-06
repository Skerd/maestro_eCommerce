import type {ClientSession, FilterQuery, Types} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Discount, {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";

/** A live, active, started and unexpired code with uses left, at `now`. */
function usableFilter(discountId: Types.ObjectId, companyId: Types.ObjectId, now: Date): FilterQuery<IDiscount> {
    return {
        _id: discountId,
        company: companyId,
        deletedAt: null,
        isActive: true,
        startsAt: {$lte: now},
        $and: [
            {$or: [{endsAt: null}, {endsAt: {$gte: now}}]},
            {$or: [{usageLimit: null}, {$expr: {$lt: ["$usageCount", "$usageLimit"]}}]},
        ],
    };
}

export class DiscountService extends BaseCrudService<IDiscount, typeof Discount> {
    constructor() {
        super(Discount, "Discount");
    }

    /** The code when it can still be used at `now`, else `null`. */
    findUsable(discountId: Types.ObjectId, companyId: Types.ObjectId, now: Date, session?: ClientSession) {
        return Discount.findOne(usableFilter(discountId, companyId, now)).session(session ?? null);
    }

    /** Counts one use atomically, only while the code is still usable; `null` when it no longer is. */
    countUseIfUsable(discountId: Types.ObjectId, companyId: Types.ObjectId, now: Date, session?: ClientSession) {
        return Discount.findOneAndUpdate(usableFilter(discountId, companyId, now), {$inc: {usageCount: 1}}, {new: true, session});
    }

    /** Counts one use regardless of the code's limits (an order already paid with it). */
    countUse(discountId: Types.ObjectId, session?: ClientSession) {
        return Discount.updateOne({_id: discountId}, {$inc: {usageCount: 1}}, {session});
    }
}

export const discountService = new DiscountService();
