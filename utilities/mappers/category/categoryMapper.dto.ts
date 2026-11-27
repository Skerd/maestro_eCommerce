import type {CategoryNames, IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {Category} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapRequestableToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {categoryDisplayName} from "@eCommerceModule/utilities/helpers/categoryName";

export function categoryToDTO(cat: IProductCategory | any): Category {
    return {
        _id: cat._id.toString(),
        name: categoryDisplayName(cat),
        names: cat.names ? {...(cat.names.toObject?.() ?? cat.names)} : undefined,
        slug: cat.slug,
        parent: categorySimpleToDTO(cat.parent),
        order: cat.order,
        ...mapSoftDeleteToDTO(cat),
        ...mapOwnershipToDTO(cat),
        ...mapLifeCycleToDTO(cat),
        ...mapRequestableToDTO(cat),
    };
}

export function categoriesToDTO(categories: IProductCategory[]): Category[] {
    return categories.map(categoryToDTO);
}

/** A populated category reference with its name in the reader's language (D195); undefined for an unpopulated id. */
export function categorySimpleToDTO(category: unknown): CategorySimple | undefined {
    if (!category || typeof category !== "object" || !("_id" in category)) return undefined;
    const simple = mapSnippet<CategorySimple>()(category, CategorySimpleSnippet);
    return simple ? {...simple, name: categoryDisplayName(category as {name?: string; names?: CategoryNames})} : undefined;
}
