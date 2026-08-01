import type {ICmsBlock} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function cmsBlockToSelect(block: ICmsBlock): ApiSelectDatum {
    return {value: block._id.toString(), label: block.title};
}

export function cmsBlocksToSelect(blocks: ICmsBlock[]): ApiSelectDatum[] {
    return blocks.map(cmsBlockToSelect);
}
