import {ObjectId} from "mongodb";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {customerGroupService} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.service";
import {CustomerGroupActions} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.actions";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import {customerGroupMemberService} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.service";
import {customerGroupToDTO, customerGroupsToDTO} from "@eCommerceModule/utilities/mappers/customerGroup/customerGroupMapper.dto";
import {customerGroupsToSelect} from "@eCommerceModule/utilities/mappers/customerGroup/customerGroupMapper.select";
import {customerGroupMembersToDTO} from "@eCommerceModule/utilities/mappers/customerGroupMember/customerGroupMemberMapper.dto";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CustomerGroupSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";
import {createCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/createCustomerGroup.form.validator";
import {editCustomerGroupFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/editCustomerGroup.form.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";

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
    buildCreateData: buildCreateDataFromSchemaDef(CustomerGroupSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(CustomerGroupSchemaDef),
    beforeDelete: async (params, doc) => {
        const {session, logger, languageCode, company, actionUserCtx} = params;
        await customerGroupMemberService.deleteMany(
            {customerGroup: doc._id, company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx?.userId},
        );
    },
    actions: CustomerGroupActions,
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: CustomerGroup,
        service: customerGroupService,
        entityName: "CustomerGroup",
        keys: ["name"],
        errorCode: "customerGroup_already_exists",
        /**
         * Members the group's own delete removed (same user, moments before the
         * group) come back with it; one re-added since keeps its live row.
         */
        afterRestore: async (group, {session, company}) => {
            if (!group.deletedAt) return;
            const deletedWithGroup = {$gte: new Date(group.deletedAt.getTime() - 5000), $lte: group.deletedAt};
            const liveUsers = await CustomerGroupMember.distinct("user", {customerGroup: group._id, company: company._id, deletedAt: null})
                .session(session);
            await CustomerGroupMember.updateMany(
                {customerGroup: group._id, company: company._id, deletedBy: nestedEntityToRef(group.deletedBy), deletedAt: deletedWithGroup, user: {$nin: liveUsers}},
                {$set: {deletedAt: null, deletedBy: null}},
                {session},
            );
        },
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/members/list",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {company, languageCode, customerGroupId, page = 1, limit = 20} = params;
        if (!customerGroupId) throw apiValidationException("validation_error", "", null, languageCode);

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit), 100);
        const filter = {customerGroup: new ObjectId(customerGroupId), company: company._id};

        const [members, total] = await Promise.all([
            CustomerGroupMember.find(filter).noDeleted()
                .populate("user", "name surname photo")
                .populate("customerGroup", "name")
                .sort({createdAt: -1})
                .skip(skip)
                .limit(Math.min(Number(limit), 100)),
            CustomerGroupMember.countDocuments(filter).noDeleted(),
        ]);

        return {data: customerGroupMembersToDTO(members), total};
    }),
);
