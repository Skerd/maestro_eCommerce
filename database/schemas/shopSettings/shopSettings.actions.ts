import {action} from "@coreModule/api/actionDecorator";
import {getModelCollectedData} from "@coreModule/database/collections";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import type {ShopSettings as ShopSettingsDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/shopSettings.dto";
import ShopSettings from "./shopSettings";
import {shopSettingsService} from "./shopSettings.service";
import {shopSettingsToDTO} from "@eCommerceModule/utilities/mappers/shopSettings/shopSettingsMapper.dto";

export class ShopSettingsActions {
    /** Get-or-create the shop's settings; used by the What we sell page (P26.8). */
    @action({auth: "private", rateLimit: {windowMs: 60000, max: 60}, transaction: true})
    async ensure(params: Record<string, any>): Promise<ShopSettingsDto> {
        const {logger, languageCode, session, actionUserCtx, company} = params;
        const doc = await shopSettingsService.getOrCreateForCompany(company._id, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        const readFields = SchemaGuard.sanitizeFields(ShopSettings, getModelCollectedData("shopsettings").readFields!, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(readFields, ShopSettings.schema);
        const populated = await shopSettingsService.findById(doc._id, {session, logger, languageCode}, populate.populate);
        return shopSettingsToDTO(populated ?? doc);
    }
}
