import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {Warehouse as WarehouseDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import {warehouseToDTO} from "@eCommerceModule/utilities/mappers/warehouse/warehouseMapper.dto";
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
    async activate(params: Record<string, any>): Promise<WarehouseDto> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<WarehouseDto> {
        return setActiveState(params, false);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<WarehouseDto> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        WarehouseModel,
        COLLECTED_DATA.warehouses.writeFields,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }

    const existing = await warehouseService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return warehouseToDTO(existing);
    }

    if (!isActive) {
        await detachWarehouseFromPosConfigsOrThrow({
            warehouseId: existing._id,
            companyId: company._id,
            languageCode,
            session,
        });
    }

    const updated = await warehouseService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return warehouseToDTO(updated);
}
