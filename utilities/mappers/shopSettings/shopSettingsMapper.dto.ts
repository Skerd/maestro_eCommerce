import type {IShopSettings} from "@eCommerceModule/database/schemas/shopSettings/shopSettings";
import type {ShopSettings} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/shopSettings.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {categorySimpleToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";

export function shopSettingsToDTO(settings: IShopSettings): ShopSettings {
    return {
        _id: settings._id.toString(),
        branches: (settings.branches ?? []).map((branch) => categorySimpleToDTO(branch)).filter((branch): branch is CategorySimple => !!branch),
        ...mapSoftDeleteToDTO(settings),
        ...mapOwnershipToDTO(settings),
        ...mapLifeCycleToDTO(settings),
    };
}

export function shopSettingsListToDTO(settings: IShopSettings[]): ShopSettings[] {
    return settings.map(shopSettingsToDTO);
}
