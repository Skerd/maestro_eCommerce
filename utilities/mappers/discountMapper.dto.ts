import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import type {Discount} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function discountToDTO(discount: IDiscount): Discount {
    return {
        _id: discount._id.toString(),
        type: discount.type,
        title: discount.title,
        code: discount.code,
        value: discount.value,
        appliesTo: discount.appliesTo,
        targetIds: discount.targetIds?.map((id: any) => id.toString()),
        minimumOrderAmount: discount.minimumOrderAmount,
        minimumQuantity: discount.minimumQuantity,
        usageLimit: discount.usageLimit,
        usageLimitPerCustomer: discount.usageLimitPerCustomer,
        usageCount: discount.usageCount,
        customerGroups: discount.customerGroups?.map((id: any) => id.toString()),
        isActive: discount.isActive,
        startsAt: discount.startsAt?.toISOString(),
        endsAt: discount.endsAt?.toISOString(),
        buyXGetY: discount.buyXGetY ? {
            buyQuantity: discount.buyXGetY.buyQuantity,
            getQuantity: discount.buyXGetY.getQuantity,
            getProductIds: discount.buyXGetY.getProductIds?.map((id: any) => id.toString()) ?? [],
        } : undefined,
        company: discount.company ? {_id: discount.company._id.toString(), name: discount.company.name} : undefined,
        ...mapSoftDeleteToDTO(discount),
        ...mapOwnershipToDTO(discount),
    };
}

export function discountsToDTO(discounts: IDiscount[]): Discount[] {
    return discounts.map(discountToDTO);
}

export function discountToSelect(discount: IDiscount): ApiSelectDatum {
    return {value: discount._id.toString(), label: discount.code ?? discount.title};
}

export function discountsToSelect(discounts: IDiscount[]): ApiSelectDatum[] {
    return discounts.map(discountToSelect);
}
