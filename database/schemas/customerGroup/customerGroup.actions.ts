import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {createCustomerGroupMemberFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/createCustomerGroupMember.form.validator";
import {removeCustomerGroupMemberFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/removeCustomerGroupMember.form.validator";
import CustomerGroupModel from "./customerGroup";
import {customerGroupService} from "./customerGroup.service";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import {customerGroupMemberService} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.service";

export class CustomerGroupActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async setDefault(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        const writeFields = SchemaGuard.sanitizeFields(
            CustomerGroupModel,
            getModelCollectedData("customerGroups").writeFields!,
            "write",
            actionUserCtx,
            languageCode,
        );
        if (!writeFields.isDefault) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        const existing = await customerGroupService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.isDefault) {
            throw apiValidationException("customer_group_already_default", "", null, languageCode);
        }

        await CustomerGroupModel.updateMany(
            {company: company._id, isDefault: true, _id: {$ne: existing._id}},
            {$set: {isDefault: false}},
            {session},
        );

        await customerGroupService.updateByIdOrThrow(
            existing._id,
            {isDefault: true},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Customer group set as default"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: createCustomerGroupMemberFormSchema,
        transaction: true,
    })
    async addMember(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, userId, customerGroup} = params;
        // Group membership drives pricing rules, so it is staff-only
        SchemaGuard.checkModelPermission(CustomerGroupMember, "create", actionUserCtx, languageCode);
        const groupId = new ObjectId(customerGroup);
        const memberUserId = new ObjectId(userId);

        const group = await customerGroupService.findOne(
            {_id: groupId, company: company._id},
            {session, logger, languageCode, withDeleted: false},
        );
        if (!group) throw apiValidationException("not_found", "", null, languageCode);

        const existing = await customerGroupMemberService.findOne(
            {user: memberUserId, customerGroup: groupId, company: company._id},
            {session, logger, languageCode, withDeleted: false},
        );
        if (existing) throw apiValidationException("customer_group_member_already_exists", "", null, languageCode);

        await customerGroupMemberService.create(
            {user: memberUserId, customerGroup: groupId, company: company._id} as any,
            {logger, languageCode, session, auditUserId: actionUserCtx?.userId},
        );

        await CustomerGroupModel.syncMemberCount(groupId, company._id, session);
        return {message: "Member added"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: removeCustomerGroupMemberFormSchema,
        transaction: true,
    })
    async removeMember(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, userId, customerGroup} = params;
        SchemaGuard.checkModelPermission(CustomerGroupMember, "delete", actionUserCtx, languageCode);
        const groupId = new ObjectId(customerGroup);

        const member = await customerGroupMemberService.findOne(
            {user: new ObjectId(userId), customerGroup: groupId, company: company._id},
            {session, logger, languageCode, withDeleted: false},
        );
        if (!member) throw apiValidationException("customer_group_member_not_found", "", null, languageCode);

        await customerGroupMemberService.deleteOneOrThrow(
            {_id: member._id, company: company._id},
            {logger, languageCode, session, auditUserId: actionUserCtx?.userId},
        );

        await CustomerGroupModel.syncMemberCount(groupId, company._id, session);
        return {message: "Member removed"};
    }
}
