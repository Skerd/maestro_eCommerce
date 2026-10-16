import {Schema} from "mongoose";

export function applyOdooLinkIndexes(OdooLinkSchema: Schema): void {
    OdooLinkSchema.index(
        {company: 1, odooModel: 1, odooId: 1},
        {unique: true, partialFilterExpression: {deletedAt: null}},
    );
    OdooLinkSchema.index({company: 1, localModel: 1, localId: 1});
}
