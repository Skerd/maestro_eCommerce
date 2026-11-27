import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import ShopSettings from "@eCommerceModule/database/schemas/shopSettings/shopSettings";
import {shopSettingsService} from "@eCommerceModule/database/schemas/shopSettings/shopSettings.service";
import {ShopSettingsActions} from "@eCommerceModule/database/schemas/shopSettings/shopSettings.actions";
import {shopSettingsListToDTO, shopSettingsToDTO} from "@eCommerceModule/utilities/mappers/shopSettings/shopSettingsMapper.dto";
import {shopSettingsToSelect} from "@eCommerceModule/utilities/mappers/shopSettings/shopSettingsMapper.select";
import {ShopSettingsSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/shopSettings.schema-def";
import {createShopSettingsFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/createShopSettings.form.validator";
import {editShopSettingsFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/editShopSettings.form.validator";

export const basePath = "/api/eCommerce/shopSettings";

// One settings document per shop (unique index); the What we sell page creates it through `ensure` (P26.8).
export const {router} = createCrudRouter({
    collectionName: "shopsettings",
    model: ShopSettings,
    service: shopSettingsService,
    entityName: "ShopSettings",
    createSchema: createShopSettingsFormSchema,
    editSchema: editShopSettingsFormSchema,
    toDTO: shopSettingsToDTO,
    toDTOArray: shopSettingsListToDTO,
    toSelect: shopSettingsToSelect,
    selectSearchField: "_id",
    actions: ShopSettingsActions,
    buildCreateData: buildCreateDataFromSchemaDef(ShopSettingsSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ShopSettingsSchemaDef),
    rateLimits: {read: 60, write: 30, delete: 0},
});
