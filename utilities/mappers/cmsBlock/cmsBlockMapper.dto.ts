import type {ICmsBlock} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import type {CmsBlock} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.dto";
import {dateToISOString} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function cmsBlockToDTO(block: ICmsBlock): CmsBlock {
    return {
        _id: block._id.toString(),
        type: block.type,
        title: block.title,
        isActive: block.isActive,
        position: block.position,
        config: block.config,
        configText: block.config ? JSON.stringify(block.config, null, 2) : undefined,
        startsAt: dateToISOString(block.startsAt) || undefined,
        endsAt: dateToISOString(block.endsAt) || undefined,
        visibility: block.visibility,
        abTestVariant: block.abTestVariant,
        ...mapSoftDeleteToDTO(block),
        ...mapOwnershipToDTO(block),
        ...mapLifeCycleToDTO(block),
    };
}

export function cmsBlocksToDTO(blocks: ICmsBlock[]): CmsBlock[] {
    return blocks.map(cmsBlockToDTO);
}
