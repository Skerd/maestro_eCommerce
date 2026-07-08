import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerAddressSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";
import {createCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/createCustomerAddress.form.validator";
import {editCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/editCustomerAddress.form.validator";
import CustomerAddress from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import {customerAddressService} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.service";
import {customerAddressToDTO, customerAddressesToDTO} from "@eCommerceModule/utilities/mappers/customerAddressMapper.dto";

const buildCustomerAddressCreateFromSchemaDef = buildCreateDataFromSchemaDef(CustomerAddressSchemaDef);
const buildCustomerAddressUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(CustomerAddressSchemaDef);

export const basePath = "/api/eCommerce/customerAddress";
export const {router} = createCrudRouter({
    collectionName: "customerAddresses",
    model: CustomerAddress,
    service: customerAddressService,
    entityName: "CustomerAddress",
    defaultSort: {isDefault: -1, createdAt: -1},
    createSchema: createCustomerAddressFormSchema,
    editSchema: editCustomerAddressFormSchema,
    toDTO: customerAddressToDTO,
    toDTOArray: customerAddressesToDTO,
    toSelect: (docs: any[]) => docs.map((d: any) => ({value: d._id.toString(), label: `${d.firstName} ${d.lastName} — ${d.city}`})),
    extraListFilter: async ({}, ctx) => {
        const userId = (ctx as any).actionUserCtx?.userId;
        return userId ? {user: userId} : {};
    },
    buildCreateData: async (params) => {
        if (params.isDefault) {
            await CustomerAddress.updateMany(
                {user: params.actionUserCtx.userId, company: params.company._id},
                {$set: {isDefault: false}},
            );
        }
        const data = buildCustomerAddressCreateFromSchemaDef(params);
        data.user = params.actionUserCtx.userId;
        if (data.isDefault === undefined) data.isDefault = false;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        if (params.isDefault === true) {
            await CustomerAddress.updateMany(
                {user: params.actionUserCtx.userId, _id: {$ne: new ObjectId(params._id as string)}},
                {$set: {isDefault: false}},
            );
        }
        return buildCustomerAddressUpdateFromSchemaDef(params, writeFields);
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
