import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {customerGroupService} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.service";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import {customerGroupMemberService} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.service";
import {mapPopulatedUserWithPhoto} from "@coreModule/utilities/mappers/common.mapper";
import {customerGroupToDTO, customerGroupsToDTO} from "@eCommerceModule/utilities/mappers/customerGroup/customerGroupMapper.dto";
import {customerGroupsToSelect} from "@eCommerceModule/utilities/mappers/customerGroup/customerGroupMapper.select";
import {customerGroupMemberToDTO, customerGroupMembersToDTO} from "@eCommerceModule/utilities/mappers/customerGroupMember/customerGroupMemberMapper.dto";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerGroupSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";
import {createCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/createCustomerGroup.form.validator";
import {editCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/editCustomerGroup.form.validator";
import {createCustomerGroupMemberFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/createCustomerGroupMember.form.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

async function syncMemberCount(customerGroupId: ObjectId, companyId: ObjectId): Promise<void> {
    const count = await CustomerGroupMember.countDocuments({
        customerGroup: customerGroupId,
        company: companyId,
        deletedAt: null,
    });
    await CustomerGroup.updateOne({_id: customerGroupId, company: companyId}, {$set: {memberCount: count}});
}

async function clearOtherDefaultGroups(companyId: ObjectId, exceptId?: ObjectId): Promise<void> {
    const filter: Record<string, unknown> = {company: companyId, isDefault: true};
    if (exceptId) filter._id = {$ne: exceptId};
    await CustomerGroup.updateMany(filter, {$set: {isDefault: false}});
}

const buildCustomerGroupCreateFromSchemaDef = buildCreateDataFromSchemaDef(CustomerGroupSchemaDef);
const buildCustomerGroupUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(CustomerGroupSchemaDef);

export const basePath = "/api/eCommerce/customerGroup";
export const {router} = createCrudRouter({
    collectionName: "customerGroups",
    model: CustomerGroup,
    service: customerGroupService,
    entityName: "CustomerGroup",
    selectSearchField: "name",
    defaultSort: {name: 1},
    createSchema: createCustomerGroupFormSchema,
    editSchema: editCustomerGroupFormSchema,
    toDTO: customerGroupToDTO,
    toDTOArray: customerGroupsToDTO,
    toSelect: customerGroupsToSelect,
    buildCreateData: async (params) => {
        const data = buildCustomerGroupCreateFromSchemaDef(params);
        if (data.isDefault === undefined) data.isDefault = false;
        return data;
    },
    buildUpdateData: async (params, writeFields) => buildCustomerGroupUpdateFromSchemaDef(params, writeFields),
    afterCreate: async (created, params) => {
        if (created.isDefault) {
            await clearOtherDefaultGroups(params.company._id, created._id);
        }
    },
    afterUpdate: async (params, existingBeforeUpdate) => {
        if (params.isDefault === true) {
            await clearOtherDefaultGroups(params.company._id, new ObjectId(params._id));
        }
    },
    beforeDelete: async (params, doc) => {
        const memberCount = await CustomerGroupMember.countDocuments({
            customerGroup: doc._id,
            company: params.company._id,
            deletedAt: null,
        });
        if (memberCount > 0) {
            await CustomerGroupMember.updateMany(
                {customerGroup: doc._id, company: params.company._id},
                {$set: {deletedAt: new Date(), deletedBy: params.actionUserCtx?.userId}},
            );
        }
    },
    enrichSingle: async (doc, params) => {
        const members = await CustomerGroupMember.find({
            customerGroup: doc._id,
            company: params.company._id,
            deletedAt: null,
        })
            .populate("user", "name surname photo")
            .limit(50)
            .lean();
        const dto = customerGroupToDTO(doc);
        return {
            ...dto,
            members: members
                .map((m) => mapPopulatedUserWithPhoto(m.user))
                .filter((u): u is NonNullable<typeof u> => !!u),
        };
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/members",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(createCustomerGroupMemberFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, userId, customerGroup} = params;
        const groupId = new ObjectId(customerGroup);
        const memberUserId = new ObjectId(userId);

        const group = await customerGroupService.findOne({_id: groupId, company: company._id}, {logger, languageCode});
        if (!group) throw apiValidationException("not_found", null, null, languageCode);

        const existing = await CustomerGroupMember.findOne({
            user: memberUserId,
            customerGroup: groupId,
            company: company._id,
            deletedAt: null,
        });
        if (existing) throw apiValidationException("validation_error", null, null, languageCode);

        const member = await customerGroupMemberService.create(
            {user: memberUserId, customerGroup: groupId, company: company._id},
            {logger, languageCode, session, auditUserId: actionUserCtx?.userId},
        );

        await syncMemberCount(groupId, company._id);
        const populated = await CustomerGroupMember.findById(member._id)
            .populate("user", "name surname photo")
            .populate("customerGroup", "name")
            .lean();
        return {data: customerGroupMemberToDTO(populated as any)};
    }),
);

router.delete(
    "/members",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, userId, customerGroupId} = params;
        if (!userId || !customerGroupId) {
            throw apiValidationException("validation_error", null, null, languageCode);
        }

        const groupId = new ObjectId(customerGroupId);
        const member = await CustomerGroupMember.findOne({
            user: new ObjectId(userId),
            customerGroup: groupId,
            company: company._id,
            deletedAt: null,
        });
        if (!member) throw apiValidationException("not_found", null, null, languageCode);

        await customerGroupMemberService.deleteOneOrThrow(
            {_id: member._id, company: company._id},
            {logger, languageCode, auditUserId: actionUserCtx?.userId},
        );

        await syncMemberCount(groupId, company._id);
        return {message: "Member removed"};
    }),
);

router.post(
    "/members/list",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {company, languageCode, customerGroupId, page = 1, limit = 20} = params;
        if (!customerGroupId) throw apiValidationException("validation_error", null, null, languageCode);

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit), 100);
        const filter = {customerGroup: new ObjectId(customerGroupId), company: company._id, deletedAt: null};

        const [members, total] = await Promise.all([
            CustomerGroupMember.find(filter)
                .populate("user", "name surname photo")
                .populate("customerGroup", "name")
                .skip(skip)
                .limit(Math.min(Number(limit), 100))
                .lean(),
            CustomerGroupMember.countDocuments(filter),
        ]);

        return {data: customerGroupMembersToDTO(members as any[]), total};
    }),
);
