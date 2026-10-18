import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createBookingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/createBooking.form.validator";
import {editBookingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/editBooking.form.validator";
import Booking from "@eCommerceModule/database/schemas/booking/booking";
import {bookingService} from "@eCommerceModule/database/schemas/booking/booking.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {bookingToDTO, bookingsToDTOArray} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.dto";
import {bookingsToSelect} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.select";
import type {IBooking} from "@eCommerceModule/database/schemas/booking/booking";

function resolveUserId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    const r = ref as {_id?: {toString?: () => string}; toString?: () => string};
    return r._id?.toString?.() ?? r.toString?.();
}

function assertValidBookingRange(startAt: Date, endAt: Date, languageCode: string) {
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
        throw apiValidationException("invalid_booking_times", null, null, languageCode);
    }
}

export const basePath = "/api/eCommerceMarketplace/booking";
export const {router} = createCrudRouter({
    collectionName: "bookings",
    model: Booking,
    service: bookingService,
    entityName: "Booking",
    defaultSort: {startAt: 1},
    createSchema: createBookingFormSchema,
    editSchema: editBookingFormSchema,
    toDTO: bookingToDTO,
    toDTOArray: bookingsToDTOArray,
    toSelect: bookingsToSelect,
    extraListFilter: async ({actionUserCtx, company, logger, languageCode}) => {
        if (actionUserCtx.isAdmin) {
            return {};
        }

        const userId = actionUserCtx.userId?.toString?.();
        if (!userId) {
            throw apiValidationException("unauthorized", null, null, languageCode);
        }

        const myOrders = await orderService.find(
            {
                company: company._id,
                $or: [
                    {customer: new ObjectId(userId)},
                    {provider: new ObjectId(userId)},
                ],
            },
            {logger, languageCode},
            null,
            "_id",
        );
        const orderIds = myOrders.map((o: any) => o._id);

        return {
            $or: [
                {provider: new ObjectId(userId)},
                ...(orderIds.length > 0 ? [{order: {$in: orderIds}}] : []),
            ],
        };
    },
    /** Domain-guard create (like productReview): order-party auth, uniqueness; provider derived from order. */
    buildCreateData: async ({order: orderRef, startAt, endAt, timezone, actionUserCtx, company, session, logger, languageCode}) => {
        const userId = actionUserCtx.userId?.toString?.();
        if (!userId) {
            throw apiValidationException("unauthorized", null, null, languageCode);
        }

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(orderRef), company: company._id},
            {session, logger, languageCode},
            "customer provider",
            "_id customer provider",
        );

        const customerId = resolveUserId((order as any).customer);
        const providerId = resolveUserId((order as any).provider);

        if (customerId !== userId && providerId !== userId) {
            throw apiValidationException("only_order_parties_can_create_booking", null, null, languageCode);
        }

        const existing = await bookingService.findOne(
            {order: new ObjectId(orderRef)},
            {session, logger, languageCode},
        );

        if (existing) {
            throw apiValidationException("order_already_has_booking", null, null, languageCode);
        }

        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        assertValidBookingRange(startDate, endDate, languageCode);

        return {
            order: new ObjectId(orderRef),
            provider: new ObjectId(providerId!),
            startAt: startDate,
            endAt: endDate,
            timezone: timezone?.trim() ? timezone.trim() : "UTC",
        };
    },
    buildUpdateData: async ({startAt, endAt, timezone, actionUserCtx, languageCode, existing}, writeFields) => {
        const booking = existing as IBooking;
        const providerIdStr = resolveUserId((booking as any).provider);

        if (!actionUserCtx.isAdmin && providerIdStr !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_or_admin_can_reschedule_booking", null, null, languageCode);
        }

        const update: Record<string, unknown> = {};

        if (startAt !== undefined && writeFields.startAt) {
            const startDate = new Date(startAt);
            if (isNaN(startDate.getTime())) {
                throw apiValidationException("invalid_start_date", null, null, languageCode);
            }
            update.startAt = startDate;
        }

        if (endAt !== undefined && writeFields.endAt) {
            const endDate = new Date(endAt);
            if (isNaN(endDate.getTime())) {
                throw apiValidationException("invalid_end_date", null, null, languageCode);
            }
            update.endAt = endDate;
        }

        if (timezone !== undefined && writeFields.timezone) {
            update.timezone = timezone;
        }

        const newStart = (update.startAt as Date | undefined) ?? booking.startAt;
        const newEnd = (update.endAt as Date | undefined) ?? booking.endAt;
        assertValidBookingRange(newStart, newEnd, languageCode);

        return update;
    },
    beforeDelete: async (params, doc) => {
        const providerIdStr = resolveUserId((doc as any).provider);

        if (!params.actionUserCtx.isAdmin && providerIdStr !== params.actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_or_admin_can_cancel_booking", null, null, params.languageCode);
        }
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
