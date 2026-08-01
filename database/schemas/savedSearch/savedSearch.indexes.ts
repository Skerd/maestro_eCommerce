import {Schema} from "mongoose";

export function applySavedSearchIndexes(SavedSearchSchema: Schema): void {
    SavedSearchSchema.index({user: 1, company: 1});
    SavedSearchSchema.index({company: 1, name: 1});
}
