import type {ICmsBlock} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import type {CmsBlock} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function cmsBlockToDTO(block: ICmsBlock): CmsBlock {
    const config = (block.config as Record<string, unknown>) ?? {};
    return {
        _id: block._id.toString(),
        type: block.type,
        title: block.title,
        isActive: block.isActive,
        position: block.position,
        config,
        configText: JSON.stringify(config, null, 2),
        startsAt: block.startsAt?.toISOString(),
        endsAt: block.endsAt?.toISOString(),
        visibility: block.visibility,
        abTestVariant: block.abTestVariant,
        company: mapCompanyLabel(block.company),
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
