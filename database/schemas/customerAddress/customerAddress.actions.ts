import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import CustomerAddressModel from "./customerAddress";
import {customerAddressService} from "./customerAddress.service";

export class CustomerAddressActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async setDefault(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        let canWriteDefault = false;
        try {
            const writeFields = SchemaGuard.sanitizeFields(
                CustomerAddressModel,
                getModelCollectedData("customerAddresses").writeFields!,
                "write",
                actionUserCtx,
                languageCode,
            );
            canWriteDefault = !!writeFields.isDefault;
        } catch {
            canWriteDefault = false;
        }

        const filter: Record<string, unknown> = {
            _id: new ObjectId(_id),
            company: company._id,
        };

        const existing = await customerAddressService.findOneOrThrow(filter, {session, logger, languageCode});

        if (existing.isDefault) {
            throw apiValidationException("customer_address_already_default", "", null, languageCode);
        }

        const ownerCustomerId = (existing.customer as {_id?: unknown})?._id ?? existing.customer;
        const isOwner = actionUserCtx.isSelf && String(ownerCustomerId) === String(actionUserCtx.userId);
        if (!isOwner && !canWriteDefault) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        await CustomerAddressModel.updateMany(
            {customer: ownerCustomerId, company: company._id, type: existing.type, isDefault: true, _id: {$ne: existing._id}},
            {$set: {isDefault: false}},
            {session},
        );

        await customerAddressService.updateByIdOrThrow(
            existing._id,
            {isDefault: true},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Customer address set as default"};
    }
}
