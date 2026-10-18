import type {IListingAddOn} from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn";
import type {ListingAddOn} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingAddOn/listingAddOn.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import type {ListingSimple} from "armonia/src/modules/eCommerce/dto/listing.dto";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ListingSimpleSnippet} from "@eCommerceModule/database/schemas/listing/listing.snippets";
import {mapOwnershipToDTO, mapSoftDeleteToDTO, mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";

export function listingAddOnToDTO(addon: IListingAddOn): ListingAddOn {
    return {
        _id: addon._id.toString(),
        listing: mapSnippet<ListingSimple>()(addon.listing, ListingSimpleSnippet),
        provider: mapSnippet<SimpleUser>()(addon.provider, SimpleUserSnippet),
        name: addon.name,
        price: {
            amount: addon.price?.amount,
            currency: mapSnippet<CurrencySimple>()(addon.price?.currency, CurrencySimpleSnippet),
        },
        deliveryDays: addon.deliveryDays,
        ...mapOwnershipToDTO(addon),
        ...mapSoftDeleteToDTO(addon),
        ...mapLifeCycleToDTO(addon),
    };
}

export function listingAddOnsToDTOArray(addons: IListingAddOn[]): ListingAddOn[] {
    return addons.map(listingAddOnToDTO);
}
