import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function fiscalConfigToSelect(config: IFiscalConfig): ApiSelectDatum {
    return {value: config._id.toString(), label: config.name};
}

export function fiscalConfigsToSelect(configs: IFiscalConfig[]): ApiSelectDatum[] {
    return configs.map(fiscalConfigToSelect);
}
