import type {Types} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import DigitalDelivery, {IDigitalDelivery} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";

export class DigitalDeliveryService extends BaseCrudService<IDigitalDelivery, typeof DigitalDelivery> {
    constructor() {
        super(DigitalDelivery, "DigitalDelivery");
    }

    /**
     * Takes one download from a live, unexpired entitlement, atomically, so concurrent requests cannot
     * exceed its limit. `null` when the token has none left.
     */
    consumeDownload(token: string) {
        return DigitalDelivery.findOneAndUpdate(
            {
                token,
                deletedAt: null,
                $expr: {$lt: ["$downloadCount", "$downloadLimit"]},
                $or: [{expiresAt: null}, {expiresAt: {$gt: new Date()}}],
            },
            {$inc: {downloadCount: 1}},
            {new: true},
        );
    }

    /** Gives back a download that streamed no file. */
    returnDownload(deliveryId: Types.ObjectId) {
        return DigitalDelivery.updateOne({_id: deliveryId}, {$inc: {downloadCount: -1}});
    }
}

export const digitalDeliveryService = new DigitalDeliveryService();
