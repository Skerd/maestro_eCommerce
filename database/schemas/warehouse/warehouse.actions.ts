import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import WarehouseModel from "./warehouse";
import {warehouseService} from "./warehouse.service";
import {detachWarehouseFromPosConfigsOrThrow} from "@eCommerceModule/utilities/services/warehousePosConfigGuard";

export class WarehouseActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, false);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async setDefault(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        const writeFields = SchemaGuard.sanitizeFields(
            WarehouseModel,
            getModelCollectedData("warehouses").writeFields!,
            "write",
            actionUserCtx,
            languageCode,
        );
        if (!writeFields.isDefault) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        const existing = await warehouseService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.isDefault) {
            throw apiValidationException("warehouse_already_default", "", null, languageCode);
        }

        await WarehouseModel.updateMany(
            {company: company._id, isDefault: true, _id: {$ne: existing._id}},
            {$set: {isDefault: false}},
            {session},
        );

        await warehouseService.updateByIdOrThrow(
            existing._id,
            {isDefault: true},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Warehouse set as default"};
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<ActionMessage> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        WarehouseModel,
        getModelCollectedData("warehouses").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }

    const existing = await warehouseService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return {message: isActive ? "Warehouse already active" : "Warehouse already inactive"};
    }

    if (!isActive) {
        await detachWarehouseFromPosConfigsOrThrow({
            warehouseId: existing._id,
            companyId: company._id,
            languageCode,
            session,
        });
    }

    await warehouseService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return {message: isActive ? "Warehouse activated" : "Warehouse deactivated"};
}
