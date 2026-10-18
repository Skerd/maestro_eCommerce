import type {IBooking} from "@eCommerceModule/database/schemas/booking/booking";
import type {Booking} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/booking.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import type {OrderSimple} from "armonia/src/modules/eCommerce/dto/order.dto";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {OrderSimpleSnippet} from "@eCommerceModule/database/schemas/order/order.snippets";
import {mapOwnershipToDTO, mapSoftDeleteToDTO, mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";

export function bookingToDTO(b: IBooking): Booking {
    return {
        _id: b._id.toString(),
        order: mapSnippet<OrderSimple>()(b.order, OrderSimpleSnippet),
        provider: mapSnippet<SimpleUser>()(b.provider, SimpleUserSnippet),
        startAt: b.startAt,
        endAt: b.endAt,
        timezone: b.timezone || "UTC",
        ...mapOwnershipToDTO(b),
        ...mapSoftDeleteToDTO(b),
        ...mapLifeCycleToDTO(b),
    };
}

export function bookingsToDTOArray(bs: IBooking[]): Booking[] {
    return bs.map(bookingToDTO);
}

export function bookingsToDTO(bs: IBooking[]): Booking[] {
    return bookingsToDTOArray(bs);
}
