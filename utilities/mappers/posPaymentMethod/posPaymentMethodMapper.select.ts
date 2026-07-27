import type {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function posPaymentMethodsToSelect(methods: IPosPaymentMethod[]): ApiSelectDatum[] {
    return methods.map((method) => ({
        value: method._id.toString(),
        label: method.name
    }));
}
