import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import type {Collection} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapMedia} from "@coreModule/utilities/mappers/common.mapper";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapProductRef(ref: any): {_id: string; title: string; slug: string} | undefined {
    if (!ref) return undefined;
    return {
        _id: ref._id?.toString() ?? String(ref),
        title: ref.title ?? "",
        slug: ref.slug ?? "",
    };
}

function mapProductRefs(refs: unknown): {_id: string; title: string; slug: string}[] {
    if (!Array.isArray(refs)) return [];
    return refs.map(mapProductRef).filter((r): r is {_id: string; title: string; slug: string} => r !== undefined);
}

export function collectionToDTO(collection: ICollection): Collection {
    const products = mapProductRefs(collection.products);
    return {
        _id: collection._id.toString(),
        type: collection.type,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        mainImage: collection.mainImage ? mapMedia(collection.mainImage) : undefined,
        isVisible: collection.isVisible,
        position: collection.position,
        products: products.length > 0 ? products : undefined,
        productCount: products.length > 0 ? products.length : ((collection.products as unknown[])?.length ?? 0),
        ruleCondition: collection.ruleCondition,
        rules: collection.rules,
        seoTitle: collection.seoTitle,
        seoDescription: collection.seoDescription,
        publishedAt: collection.publishedAt?.toISOString(),
        company: collection.company ? {_id: collection.company._id.toString(), name: collection.company.name} : undefined,
        ...mapSoftDeleteToDTO(collection),
        ...mapOwnershipToDTO(collection),
    };
}

export function collectionsToDTO(collections: ICollection[]): Collection[] {
    return collections.map(collectionToDTO);
}

export function collectionToSelect(collection: ICollection): ApiSelectDatum {
    return {value: collection._id.toString(), label: collection.name};
}

export function collectionsToSelect(collections: ICollection[]): ApiSelectDatum[] {
    return collections.map(collectionToSelect);
}
