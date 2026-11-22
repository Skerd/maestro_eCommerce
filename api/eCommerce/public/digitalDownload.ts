import {Router} from "express";
import {Request, Response} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {getLogger} from "@coreModule/loggers/serverLog";
import {isHeldForReview, serveMedia} from "@coreModule/utilities/media/serveMedia";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {asCrossTenant, setRequestTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {digitalDeliveryService} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery.service";

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

        // The token, the secret, names one company's delivery: it is looked up across companies, and the rest of the
        // request runs in that company (D16, TD-B252).
        const delivery = await asCrossTenant("a download token names its company's delivery", () => digitalDeliveryService.consumeDownload(token));

        const deliveryCompany = nestedEntityToRef(delivery?.company);
        if (!delivery || !deliveryCompany) {
            throw apiValidationException("download_not_available", null, null, languageCode);
        }
        setRequestTenant(deliveryCompany);

        const allowed = (delivery.media as any[]).some(id => (id?._id ?? id).toString() === mediaId);
        if (!allowed) {
            // The request didn't stream a file — give the download back
            await digitalDeliveryService.returnDownload(delivery._id);
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
                if (mediaCompany === "" || mediaCompany !== deliveryCompany) return false;
                // A file the content check holds is not sent to a buyer until the platform approves it (D177); the
                // download is given back.
                if (isHeldForReview(media)) {
                    await digitalDeliveryService.returnDownload(delivery._id);
                    throw apiValidationException("download_held_for_review", null, null, languageCode);
                }
                return true;
            },
        });
    }),
);
