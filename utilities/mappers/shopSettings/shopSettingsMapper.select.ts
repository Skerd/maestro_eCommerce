import type {IShopSettings} from "@eCommerceModule/database/schemas/shopSettings/shopSettings";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function shopSettingsToSelect(settings: IShopSettings[]): ApiSelectDatum[] {
    return settings.map((row) => ({value: row._id.toString(), label: row._id.toString()}));
}
