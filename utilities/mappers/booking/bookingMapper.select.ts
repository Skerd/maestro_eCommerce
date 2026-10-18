import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import type {IBooking} from "@eCommerceModule/database/schemas/booking/booking";

export function bookingToSelect(booking: IBooking | any): ApiSelectDatum {
    const providerName = [booking.provider?.name, booking.provider?.surname].filter(Boolean).join(" ").trim();
    const startLabel = booking.startAt ? new Date(booking.startAt).toISOString() : "";
    const label = [providerName, startLabel].filter(Boolean).join(" · ") || booking._id.toString();

    return {
        value: booking._id.toString(),
        label,
    };
}

export function bookingsToSelect(bookings: (IBooking | any)[]): ApiSelectDatum[] {
    return bookings.map(bookingToSelect);
}
