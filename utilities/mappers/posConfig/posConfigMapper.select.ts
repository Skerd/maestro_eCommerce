import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function posConfigsToSelect(configs: IPosConfig[]): ApiSelectDatum[] {
    return configs.map((c) => ({
        value: c._id.toString(),
        label: c.name
    }));

}
