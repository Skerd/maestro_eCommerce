import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerAddressSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";
import {createCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/createCustomerAddress.form.validator";
import {editCustomerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/editCustomerAddress.form.validator";
import {customerAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.form.validator";
import {
    myCustomerAddressCreateFormSchema,
    myCustomerAddressEditFormSchema,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/myCustomerAddress.form.validator";
import type {
    MyCustomerAddressCreateFormType,
    MyCustomerAddressEditFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/myCustomerAddress.form.validator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import CustomerAddress from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import {customerAddressService} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.service";
import {CustomerAddressActions} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.actions";
import {customerAddressToDTO, customerAddressesToDTO} from "@eCommerceModule/utilities/mappers/customerAddress/customerAddressMapper.dto";
import {customerAddressesToSelect} from "@eCommerceModule/utilities/mappers/customerAddress/customerAddressMapper.select";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";

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

const ADDRESS_POPULATE = ["city", "state", "country", "customer"];

async function clearOtherDefaults(
    params: AuthenticatedMWType & {session?: unknown; type: string; keepId?: ObjectId},
): Promise<void> {
    await CustomerAddress.updateMany(
        {
            company: params.company._id,
            customer: new ObjectId(params.actionUserCtx.userId),
            type: params.type,
            isDefault: true,
            ...(params.keepId ? {_id: {$ne: params.keepId}} : {}),
        },
        {$set: {isDefault: false}},
        {session: params.session as never},
    );
}

function buyerAddressFilter(params: AuthenticatedMWType, _id?: string) {
    return {
        company: params.company._id,
        customer: new ObjectId(params.actionUserCtx.userId),
        ...(_id ? {_id: new ObjectId(_id)} : {}),
    };
}

router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: AuthenticatedMWType) => {
        const {logger, languageCode} = params;
        const addresses = await customerAddressService.find(
            buyerAddressFilter(params),
            {logger, languageCode, withDeleted: false},
            ADDRESS_POPULATE,
            undefined,
            {isDefault: -1, createdAt: -1},
        );
        return {data: customerAddressesToDTO(addresses)};
    }),
);

router.put(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(myCustomerAddressCreateFormSchema),
    transactionHandler(),
    asyncHandler(async (params: TransactionRequiredParams & MyCustomerAddressCreateFormType) => {
        const {logger, languageCode, session, actionUserCtx, company} = params;
        const type = params.type ?? "shipping";
        if (params.isDefault) {
            await clearOtherDefaults({...params, type});
        }
        const created = await customerAddressService.create(
            {
                customer: new ObjectId(actionUserCtx.userId),
                type,
                firstName: params.firstName,
                lastName: params.lastName,
                email: params.email,
                phone: params.phone,
                street: params.street,
                city: new ObjectId(params.city),
                ...(params.state ? {state: new ObjectId(params.state)} : {}),
                postalCode: params.postalCode,
                country: new ObjectId(params.country),
                latitude: params.latitude ?? 0,
                longitude: params.longitude ?? 0,
                label: params.label,
                isDefault: params.isDefault ?? false,
                company: company._id,
            },
            {logger, languageCode, session, auditUserId: actionUserCtx.userId},
        );
        const populated = await customerAddressService.findById(
            created._id,
            {logger, languageCode, session},
            ADDRESS_POPULATE,
        );
        return {data: customerAddressToDTO(populated ?? created)};
    }),
);

router.patch(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(myCustomerAddressEditFormSchema),
    transactionHandler(),
    asyncHandler(async (params: TransactionRequiredParams & MyCustomerAddressEditFormType) => {
        const {logger, languageCode, session, _id} = params;
        const existing = await customerAddressService.findOne(
            buyerAddressFilter(params, _id),
            {logger, languageCode, session, withDeleted: false},
        );
        if (!existing) {
            throw apiValidationException("customer_address_not_found", "", null, languageCode);
        }
        const type = params.type ?? existing.type;
        if (params.isDefault) {
            await clearOtherDefaults({...params, type, keepId: existing._id});
        }
        existing.set({
            type,
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email,
            phone: params.phone,
            street: params.street,
            city: new ObjectId(params.city),
            state: params.state ? new ObjectId(params.state) : undefined,
            postalCode: params.postalCode,
            country: new ObjectId(params.country),
            latitude: params.latitude ?? existing.latitude,
            longitude: params.longitude ?? existing.longitude,
            label: params.label,
            isDefault: params.isDefault ?? existing.isDefault,
        });
        existing.$locals = existing.$locals || {};
        existing.$locals.auditUserId = new ObjectId(params.actionUserCtx.userId);
        await existing.save({session});
        const populated = await customerAddressService.findById(
            existing._id,
            {logger, languageCode, session},
            ADDRESS_POPULATE,
        );
        return {data: customerAddressToDTO(populated ?? existing)};
    }),
);

router.delete(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(validateSingleForm),
    transactionHandler(),
    asyncHandler(async (params: TransactionRequiredParams & {_id: string}) => {
        const {logger, languageCode, session, _id} = params;
        const existing = await customerAddressService.findOne(
            buyerAddressFilter(params, _id),
            {logger, languageCode, session, withDeleted: false},
        );
        if (!existing) {
            throw apiValidationException("customer_address_not_found", "", null, languageCode);
        }
        await customerAddressService.deleteById(existing._id, {
            logger,
            languageCode,
            session,
            auditUserId: params.actionUserCtx.userId,
        });
        return {data: {_id}};
    }),
);

