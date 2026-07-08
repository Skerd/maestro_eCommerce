import type {ICmsBlock} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import type {CmsBlock} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function cmsBlockToDTO(block: ICmsBlock): CmsBlock {
    return {
        _id: block._id.toString(),
        type: block.type,
        title: block.title,
        isActive: block.isActive,
        position: block.position,
        config: block.config as Record<string, unknown>,
        startsAt: block.startsAt?.toISOString(),
        endsAt: block.endsAt?.toISOString(),
        visibility: block.visibility,
        abTestVariant: block.abTestVariant,
        company: block.company ? {_id: block.company._id.toString(), name: block.company.name} : undefined,
        ...mapSoftDeleteToDTO(block),
        ...mapOwnershipToDTO(block),
    };
}

export function cmsBlocksToDTO(blocks: ICmsBlock[]): CmsBlock[] {
    return blocks.map(cmsBlockToDTO);
}

export function cmsBlockToSelect(block: ICmsBlock): ApiSelectDatum {
    return {value: block._id.toString(), label: block.title};
}

export function cmsBlocksToSelect(blocks: ICmsBlock[]): ApiSelectDatum[] {
    return blocks.map(cmsBlockToSelect);
}
