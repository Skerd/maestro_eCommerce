import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerAddressSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";
import {createCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/createCustomerAddress.form.validator";
import {editCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/editCustomerAddress.form.validator";
import {customerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.form.validator";
import CustomerAddress from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import {customerAddressService} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.service";
import {CustomerAddressActions} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.actions";
import {customerAddressToDTO, customerAddressesToDTO} from "@eCommerceModule/utilities/mappers/customerAddress/customerAddressMapper.dto";
import {customerAddressesToSelect} from "@eCommerceModule/utilities/mappers/customerAddress/customerAddressMapper.select";

function customerAddressExtraListFilter(params: Record<string, any>) {
    const {customerId} = params;
    if (!customerId) return {};
    return {customer: new ObjectId(customerId)};
}

export const basePath = "/api/eCommerce/customerAddress";
export const {router} = createCrudRouter({
    collectionName: "customerAddresses",
    model: CustomerAddress,
    service: customerAddressService,
    entityName: "CustomerAddress",
    defaultSort: {createdAt: -1},
    createSchema: createCustomerAddressFormSchema,
    editSchema: editCustomerAddressFormSchema,
    listSchema: customerAddressFormSchema,
    toDTO: customerAddressToDTO,
    toDTOArray: customerAddressesToDTO,
    toSelect: customerAddressesToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(CustomerAddressSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(CustomerAddressSchemaDef),
    extraListFilter: customerAddressExtraListFilter,
    actions: CustomerAddressActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});

