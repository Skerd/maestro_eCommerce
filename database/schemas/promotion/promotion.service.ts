/**
 * Promotion Service
 *
 * CRUD service for Promotion model.
 */

import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import Promotion, { IPromotion } from "@eCommerceModule/database/schemas/promotion/promotion";

export class PromotionService extends BaseCrudService<IPromotion, typeof Promotion> {
    constructor() {
        super(Promotion, "Promotion");
    }
}

export const promotionService = new PromotionService();
