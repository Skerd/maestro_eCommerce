import {Router} from "express";
import {Request, Response} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {getLogger} from "@coreModule/loggers/serverLog";
import {serveMedia} from "@coreModule/utilities/media/serveMedia";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";

export const basePath = "/api/eCommerce/digitalDownload";
export const router = Router();

/**
 * Token-authenticated download for purchased digital goods. The token is the
 * secret (issued per paid order line); each successful request consumes one
 * download from the entitlement's limit, atomically, so concurrent requests
 * cannot exceed it.
 */
router.get(
    "/:token/:mediaId",
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (_params: any, queryParams: any, req: Request, res: Response) => {
        const logger = getLogger("digital_download");
        const languageCode = req.header("language") || "en-US";
        const {token, mediaId} = queryParams;

        const delivery = await DigitalDelivery.findOneAndUpdate(
            {
                token,
                $expr: {$lt: ["$downloadCount", "$downloadLimit"]},
                $or: [{expiresAt: null}, {expiresAt: {$gt: new Date()}}],
            },
            {$inc: {downloadCount: 1}},
            {new: true},
        );

        if (!delivery) {
            throw apiValidationException("download_not_available", null, null, languageCode);
        }

        const allowed = (delivery.media as any[]).some(id => (id?._id ?? id).toString() === mediaId);
        if (!allowed) {
            // The request didn't stream a file — give the download back
            await DigitalDelivery.updateOne({_id: delivery._id}, {$inc: {downloadCount: -1}});
            throw apiValidationException("file_not_in_delivery", null, null, languageCode);
        }

        return serveMedia({
            mediaId,
            req,
            res,
            logger,
            languageCode,
            cacheControl: "private",
            accessCheck: async (_id, media) => {
                const mediaCompany = String((media.company as {_id?: unknown})?._id ?? media.company ?? "");
                const deliveryCompany = String((delivery.company as {_id?: unknown})?._id ?? delivery.company ?? "");
                return mediaCompany !== "" && mediaCompany === deliveryCompany;
            },
        });
    }),
);
