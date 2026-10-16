import {Schema} from "mongoose";

export function applyOdooConnectionIndexes(OdooConnectionSchema: Schema): void {
    OdooConnectionSchema.index(
        {company: 1},
        {unique: true, partialFilterExpression: {deletedAt: null}},
    );
}
