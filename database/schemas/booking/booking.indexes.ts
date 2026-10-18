import { Schema } from "mongoose";

export function applyBookingIndexes(BookingSchema: Schema): void {
    BookingSchema.index({ order: 1 }, { unique: true });
    BookingSchema.index({ provider: 1, startAt: 1 });
    BookingSchema.index({ company: 1 });
}
