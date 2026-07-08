import {Schema} from "mongoose";

export function applyCartIndexes(CartSchema: Schema): void {
    CartSchema.index({sessionId: 1, company: 1});
    CartSchema.index({user: 1, company: 1});
    // TTL index — MongoDB auto-deletes expired carts
    CartSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
}
