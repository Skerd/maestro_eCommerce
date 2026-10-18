import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {validatePromotionStopForm} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/promotion/stopPromotion.action.validator";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {promotionService} from "@eCommerceModule/database/schemas/promotion/promotion.service";

export class PromotionActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async pause(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start("Pausing promotion...");

        const doc = await promotionService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, {logger, languageCode, session});

        if (doc.deletedAt) {
            throw apiValidationException("promotion_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }
        if (doc.lifecycleStatus !== "active") {
            throw apiValidationException("promotion_not_pausable", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await promotionService.updateByIdOrThrow(new ObjectId(_id), {lifecycleStatus: "paused"}, {logger, languageCode, session, auditUserId: actionUserCtx.userId});

        logger.finish("Promotion paused!");
        return {message: "Promotion successfully paused"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async resume(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start("Resuming promotion...");

        const doc = await promotionService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, {logger, languageCode, session});

        if (doc.deletedAt) {
            throw apiValidationException("promotion_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }
        if (doc.lifecycleStatus !== "paused") {
            throw apiValidationException("promotion_not_resumable", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }
        const endAt = doc.endAt ? new Date(doc.endAt).getTime() : 0;
        if (endAt <= Date.now()) {
            throw apiValidationException("promotion_not_resumable", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await promotionService.updateByIdOrThrow(new ObjectId(_id), {lifecycleStatus: "active"}, {logger, languageCode, session, auditUserId: actionUserCtx.userId});

        logger.finish("Promotion resumed!");
        return {message: "Promotion successfully resumed"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validatePromotionStopForm,
    })
    async stop(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id, stopReason} = params;

        logger.start("Stopping promotion...");

        const doc = await promotionService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, {logger, languageCode, session});

        if (doc.deletedAt) {
            throw apiValidationException("promotion_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }
        if (doc.lifecycleStatus === "stopped") {
            throw apiValidationException("promotion_already_stopped", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await promotionService.updateByIdOrThrow(
            new ObjectId(_id),
            {lifecycleStatus: "stopped", stopReason},
            {logger, languageCode, session, auditUserId: actionUserCtx.userId},
        );

        logger.finish("Promotion stopped!");
        return {message: "Promotion successfully stopped"};
    }
}
