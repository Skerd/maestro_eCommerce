import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createBookingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/createBooking.form.validator";
import {editBookingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/editBooking.form.validator";
import type {
    CreateBookingFormType,
    EditBookingFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/booking/booking.schema-def";
import Booking, {type IBooking} from "@eCommerceModule/database/schemas/booking/booking";
import {bookingService} from "@eCommerceModule/database/schemas/booking/booking.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {bookingToDTO, bookingsToDTOArray} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.dto";
import {bookingsToSelect} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.select";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";
import {assertOwnerOrAdmin, isOrderParty, orderChildFilter} from "@eCommerceModule/utilities/services/marketplaceAccess";

function assertValidBookingRange(startAt: Date, endAt: Date, languageCode: string): void {
    if (endAt <= startAt) {
        throw apiValidationException("invalid_booking_times", null, null, languageCode);
    }
}

export const basePath = "/api/eCommerceMarketplace/booking";
export const {router} = createCrudRouter<IBooking, CreateBookingFormType, EditBookingFormType>({
    collectionName: "bookings",
    model: Booking,
    service: bookingService,
    entityName: "Booking",
    defaultSort: {startAt: 1},
    selectProjection: "_id startAt",
    selectSort: {startAt: 1},
    createSchema: createBookingFormSchema,
    editSchema: editBookingFormSchema,
    toDTO: bookingToDTO,
    toDTOArray: bookingsToDTOArray,
    toSelect: bookingsToSelect,
    documentFilter: async ({company, actionUserCtx, logger, languageCode}) => ({
        company: company._id,
        $and: [await orderChildFilter(company._id, actionUserCtx, {logger, languageCode})],
    }),
    extraSelectFilter: ({company, actionUserCtx, logger, languageCode}) => orderChildFilter(company._id, actionUserCtx, {logger, languageCode}),
    /** A party books an active order once; the provider is taken from the order. */
    buildCreateData: async ({order: orderRef, startAt, endAt, timezone, actionUserCtx, company, session, logger, languageCode}) => {
        const opts = {session, logger, languageCode};
        const order = await orderService.findOneOrThrow({_id: new ObjectId(orderRef), company: company._id}, opts);

        if (!isOrderParty(order, actionUserCtx.userId, "customer") && !isOrderParty(order, actionUserCtx.userId, "provider")) {
            throw apiValidationException("only_order_parties_can_create_booking", null, null, languageCode);
        }
        if (order.status !== "accepted" && order.status !== "in_progress") {
            throw apiValidationException("booking_order_not_active", null, null, languageCode);
        }
        if (await bookingService.findOne({order: order._id, company: company._id}, opts, null, "_id")) {
            throw apiValidationException("order_already_has_booking", null, null, languageCode);
        }

        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        assertValidBookingRange(startDate, endDate, languageCode);

        return {
            order: order._id,
            provider: order.provider._id,
            startAt: startDate,
            endAt: endDate,
            timezone: timezone?.trim() || "UTC",
        };
    },
    /** Only the provider (or an admin) reschedules. */
    buildUpdateData: ({startAt, endAt, timezone, actionUserCtx, languageCode, existing}, writeFields) => {
        assertOwnerOrAdmin(existing.provider, actionUserCtx, languageCode);

        const newStart = startAt !== undefined && writeFields.startAt ? new Date(startAt) : undefined;
        const newEnd = endAt !== undefined && writeFields.endAt ? new Date(endAt) : undefined;
        assertValidBookingRange(newStart ?? existing.startAt, newEnd ?? existing.endAt, languageCode);

        return {
            ...(newStart && {startAt: newStart}),
            ...(newEnd && {endAt: newEnd}),
            ...(timezone !== undefined && writeFields.timezone && {timezone}),
        };
    },
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: Booking,
        service: bookingService,
        entityName: "Booking",
        keys: ["order"],
        errorCode: "order_already_has_booking",
    }),
    beforeDelete: async (params, doc) => {
        assertOwnerOrAdmin(doc.provider, params.actionUserCtx, params.languageCode);
        await assertCanDelete(Booking.modelName, doc._id, params.languageCode, params.session);
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
