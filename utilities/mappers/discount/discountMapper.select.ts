import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function discountToSelect(discount: IDiscount): ApiSelectDatum {
    return {
        value: discount._id.toString(),
        label: discount.code ?? discount.title,
    };
}

export function discountsToSelect(discounts: IDiscount[]): ApiSelectDatum[] {
    return discounts.map(discountToSelect);
}
