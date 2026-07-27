import type {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import type {PosPaymentMethod} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

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
        company: mapPopulatedRef(method.company),
        ...mapSoftDeleteToDTO(method),
        ...mapOwnershipToDTO(method),
        ...mapLifeCycleToDTO(method),
    };
}

export function posPaymentMethodsToDTO(methods: IPosPaymentMethod[]): PosPaymentMethod[] {
    return methods.map(posPaymentMethodToDTO);
}
