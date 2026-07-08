import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {customerGroupService} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.service";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import {customerGroupMemberService} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.service";
import {customerGroupToDTO, customerGroupsToDTO, customerGroupToSelect, customerGroupsToSelect} from "@eCommerceModule/utilities/mappers/customerGroupMapper.dto";
import {customerGroupMemberToDTO, customerGroupMembersToDTO} from "@eCommerceModule/utilities/mappers/customerGroupMemberMapper.dto";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerGroupSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";
import {createCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/createCustomerGroup.form.validator";
import {editCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/editCustomerGroup.form.validator";
import {createCustomerGroupMemberFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/createCustomerGroupMember.form.validator";

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
            .populate("user", "name surname email")
            .limit(50)
            .lean();
        const dto = customerGroupToDTO(doc);
        return {
            ...dto,
            members: members.map((m) => ({
                _id: (m.user as any)?._id?.toString() ?? "",
                name: (m.user as any)?.name ?? "",
                surname: (m.user as any)?.surname ?? "",
                email: (m.user as any)?.email,
            })),
        };
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/members",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx, session} = req;
        const parsed = createCustomerGroupMemberFormSchema(languageCode, req.body).safeParse(req.body);
        if (!parsed.success) return res.status(400).json({message: parsed.error.message});

        const {user, customerGroup} = parsed.data;
        const groupId = new ObjectId(customerGroup);
        const userId = new ObjectId(user);

        const group = await customerGroupService.findOne({_id: groupId, company: company._id}, {logger, languageCode});
        if (!group) return res.status(404).json({message: "customer_group_not_found"});

        const existing = await CustomerGroupMember.findOne({
            user: userId,
            customerGroup: groupId,
            company: company._id,
            deletedAt: null,
        });
        if (existing) return res.status(409).json({message: "member_already_exists"});

        const member = await customerGroupMemberService.create(
            {user: userId, customerGroup: groupId, company: company._id},
            {logger, languageCode, session, auditUserId: actionUserCtx?.userId},
        );

        await syncMemberCount(groupId, company._id);
        const populated = await CustomerGroupMember.findById(member._id).populate("user", "name surname email").populate("customerGroup", "name").lean();
        return res.json({data: customerGroupMemberToDTO(populated as any)});
    }),
);

router.delete(
    "/members",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {userId, customerGroupId} = req.body;
        if (!userId || !customerGroupId) return res.status(400).json({message: "userId and customerGroupId required"});

        const groupId = new ObjectId(customerGroupId);
        const member = await CustomerGroupMember.findOne({
            user: new ObjectId(userId),
            customerGroup: groupId,
            company: company._id,
            deletedAt: null,
        });
        if (!member) return res.status(404).json({message: "member_not_found"});

        await customerGroupMemberService.deleteOneOrThrow(
            {_id: member._id, company: company._id},
            {logger, languageCode, auditUserId: actionUserCtx?.userId},
        );

        await syncMemberCount(groupId, company._id);
        return res.json({message: "Member removed"});
    }),
);

router.post(
    "/members/list",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {customerGroupId, page = 1, limit = 20} = req.body;
        if (!customerGroupId) return res.status(400).json({message: "customerGroupId required"});

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit), 100);
        const filter = {customerGroup: new ObjectId(customerGroupId), company: company._id, deletedAt: null};

        const [members, total] = await Promise.all([
            CustomerGroupMember.find(filter)
                .populate("user", "name surname email")
                .populate("customerGroup", "name")
                .skip(skip)
                .limit(Math.min(Number(limit), 100))
                .lean(),
            CustomerGroupMember.countDocuments(filter),
        ]);

        return res.json({data: customerGroupMembersToDTO(members as any[]), total});
    }),
);
