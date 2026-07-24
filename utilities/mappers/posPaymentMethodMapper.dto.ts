import type {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import type {PosPaymentMethod} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function posPaymentMethodToDTO(method: IPosPaymentMethod): PosPaymentMethod {
    return {
        _id: method._id.toString(),
        name: method.name,
        type: method.type,
        isActive: method.isActive,
        sequence: method.sequence,
        cashQuickAmounts: method.cashQuickAmounts,
        terminalEnabled: method.terminalEnabled,
        terminalProvider: method.terminalProvider,
        terminalHost: method.terminalHost,
        terminalPort: method.terminalPort,
        terminalId: method.terminalId,
        terminalPath: method.terminalPath,
        company: mapCompanyLabel(method.company),
        ...mapSoftDeleteToDTO(method),
        ...mapOwnershipToDTO(method),
    };
}

export function posPaymentMethodsToDTO(methods: IPosPaymentMethod[]): PosPaymentMethod[] {
    return methods.map(posPaymentMethodToDTO);
}

export function posPaymentMethodToSelect(method: IPosPaymentMethod): ApiSelectDatum {
    return {value: method._id.toString(), label: method.name};
}

export function posPaymentMethodsToSelect(methods: IPosPaymentMethod[]): ApiSelectDatum[] {
    return methods.map(posPaymentMethodToSelect);
}
