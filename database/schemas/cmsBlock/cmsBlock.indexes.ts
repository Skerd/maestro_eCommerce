import {Schema} from "mongoose";

export function applyCmsBlockIndexes(CmsBlockSchema: Schema): void {
    CmsBlockSchema.index({company: 1, isActive: 1, position: 1});
    CmsBlockSchema.index({company: 1, type: 1});
    CmsBlockSchema.index({company: 1, startsAt: 1, endsAt: 1});
}
