import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
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

function resolveOwnerUserId(params: {actionUserCtx: any; user?: unknown}): ObjectId {
    if (params.actionUserCtx?.isAdmin && params.user) {
        return new ObjectId(String(params.user));
    }
    return new ObjectId(params.actionUserCtx.userId);
}

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
    toSelect: (docs: any[]) =>
        docs.map((d: any) => ({value: d._id.toString(), label: `${d.firstName} ${d.lastName} — ${d.city}`})),
    // Admins manage every customer's addresses; buyers only ever see their own.
    extraListFilter: async ({actionUserCtx}) => {
        if (actionUserCtx?.isAdmin) return {};
        const userId = actionUserCtx?.userId;
        return userId ? {user: new ObjectId(userId)} : {};
    },
    documentFilter: async ({company, actionUserCtx}) => {
        const base: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.isAdmin) return base;
        return {...base, user: new ObjectId(actionUserCtx.userId)};
    },
    buildCreateData: async (params) => {
        const ownerUserId = resolveOwnerUserId(params);
        if (params.isDefault) {
            await CustomerAddress.updateMany(
                {user: ownerUserId, company: params.company._id},
                {$set: {isDefault: false}},
            );
        }
        const data = buildCustomerAddressCreateFromSchemaDef(params);
        data.user = ownerUserId;
        if (data.isDefault === undefined) data.isDefault = false;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const ownerUserId = resolveOwnerUserId({
            actionUserCtx: params.actionUserCtx,
            user: params.user ?? params.actionUserCtx.userId,
        });
        if (params.isDefault === true) {
            await CustomerAddress.updateMany(
                {user: ownerUserId, company: params.company._id, _id: {$ne: new ObjectId(params._id as string)}},
                {$set: {isDefault: false}},
            );
        }
        const data = buildCustomerAddressUpdateFromSchemaDef(params, writeFields);
        if (params.actionUserCtx?.isAdmin && (writeFields as any)?.user && params.user) {
            data.user = new ObjectId(String(params.user));
        }
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/setDefault",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {customerAddressId} = req.body;

        if (!customerAddressId) return res.status(400).json({message: "customerAddressId required"});

        const filter: Record<string, unknown> = {
            _id: new ObjectId(customerAddressId),
            company: company._id,
        };
        if (!actionUserCtx?.isAdmin) {
            filter.user = new ObjectId(actionUserCtx.userId);
        }

        const address = await customerAddressService.findOneOrThrow(filter, {logger, languageCode});
        const ownerUserId = (address.user as any)?._id ?? address.user;

        await CustomerAddress.updateMany(
            {user: ownerUserId, company: company._id, _id: {$ne: address._id}},
            {$set: {isDefault: false}},
        );

        await customerAddressService.updateById(address._id, {$set: {isDefault: true}}, {logger, languageCode});

        const updated = await customerAddressService.findById(address._id, {logger, languageCode});
        return res.json({data: updated ? customerAddressToDTO(updated) : null});
    }),
);
