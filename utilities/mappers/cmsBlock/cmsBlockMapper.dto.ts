import type {ICmsBlock, ICmsBlockConfig} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import type {CmsBlock, CmsBlockConfig} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.dto";
import type {CollectionSimple} from "armonia/src/modules/eCommerce/dto/collection.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import {dateToISOString, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";

function cmsBlockConfigToDTO(config: ICmsBlockConfig | undefined): CmsBlockConfig {
    if (!config) return {};
    return {
        headline: config.headline,
        subheadline: config.subheadline,
        imageUrl: config.imageUrl,
        ctaLabel: config.ctaLabel,
        ctaHref: config.ctaHref,
        message: config.message,
        linkHref: config.linkHref,
        html: config.html,
        url: config.url,
        collectionId: mapSnippet<CollectionSimple>()(config.collectionId, CollectionSimpleSnippet),
        categoryIds: config.categoryIds
            ?.map((category) => mapSnippet<CategorySimple>()(category, CategorySimpleSnippet))
            .filter((category): category is CategorySimple => category != null),
        limit: config.limit,
        slides: config.slides,
        items: config.items,
    };
}

export function cmsBlockToDTO(block: ICmsBlock): CmsBlock {
    return {
        _id: block._id.toString(),
        type: block.type,
        title: block.title,
        isActive: block.isActive,
        position: block.position,
        config: cmsBlockConfigToDTO(block.config),
        startsAt: dateToISOString(block.startsAt) || undefined,
        endsAt: dateToISOString(block.endsAt) || undefined,
        visibility: block.visibility,
        ...mapSoftDeleteToDTO(block),
        ...mapLifeCycleToDTO(block),
        ...mapOwnershipToDTO(block),
    };
}

export function cmsBlocksToDTO(blocks: ICmsBlock[]): CmsBlock[] {
    return blocks.map(cmsBlockToDTO);
}
