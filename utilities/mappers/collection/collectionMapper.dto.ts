import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import type {Collection} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.dto";
import {mapMedia} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function collectionToDTO(collection: ICollection): Collection {

    const products = collection.products?.map((collection) => {
        return {
            _id: collection._id?.toString(),
            title: collection.title,
            slug: collection.slug,
            sku: collection.sku,
        }
    }) ?? undefined;

    return {
        _id: collection._id.toString(),
        type: collection.type,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        mainImage: collection.mainImage ? mapMedia(collection.mainImage) : undefined,
        isVisible: collection.isVisible,
        position: collection.position,
        products: products,
        productCount: products?.length || 0,
        ruleCondition: collection.ruleCondition,
        rules: collection.rules,
        seoTitle: collection.seoTitle,
        seoDescription: collection.seoDescription,
        publishedAt: collection.publishedAt?.toISOString(),
        ...mapSoftDeleteToDTO(collection),
        ...mapOwnershipToDTO(collection),
        ...mapLifeCycleToDTO(collection)
    };
}

export function collectionsToDTO(collections: ICollection[]): Collection[] {
    return collections.map(collectionToDTO);
}
