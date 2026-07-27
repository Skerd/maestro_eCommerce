import type {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function productAttributesToSelect(attrs: IProductAttribute[]): ApiSelectDatum[] {
    return attrs.map((c) => ({
        value: c._id.toString(),
        label: c.name
    }));
}
