import {IPromotion} from "@eCommerceModule/database/schemas/promotion/promotion";
import type {Promotion} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/promotion/promotion.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO, mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function promotionToDTO(promotion: IPromotion): Promotion {
    return {
        _id: promotion._id.toString(),
        name: promotion.name,
        listing: promotion.listing ? {
            _id: (promotion.listing._id ?? promotion.listing).toString(),
            name: promotion.listing.name,
            title: promotion.listing.title,
            status: promotion.listing.status
        } : undefined,
        type: promotion.type,
        lifecycleStatus: promotion.lifecycleStatus ?? "active",
        stopReason: promotion.stopReason ?? undefined,
        startAt: promotion.startAt,
        endAt: promotion.endAt,
        ...mapOwnershipToDTO(promotion),
        ...mapSoftDeleteToDTO(promotion),
        ...mapLifeCycleToDTO(promotion),
    };
}

export function promotionsToDTOArray(promotions: IPromotion[]): Promotion[] {
    return promotions.map(promotionToDTO);
}