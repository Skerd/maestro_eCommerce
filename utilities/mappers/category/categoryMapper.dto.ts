import type {CategoryNames, IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {Category} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.dto";
import type {CategorySimple, CategorySimpleSource} from "armonia/src/modules/eCommerce/dto/category.dto";
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
        slug: cat.slug,
        parent: categorySimpleToDTO(cat.parent),
        order: cat.order,
        ...mapSoftDeleteToDTO(cat),
        ...mapOwnershipToDTO(cat),
        ...mapLifeCycleToDTO(cat),
        ...mapRequestableToDTO(cat),
    };
}

/** The single read the edit form loads: also every language's name, which the platform edits (D195). */
export function categoryEditToDTO(cat: IProductCategory): Category {
    const names = cat.names;
    return {...categoryToDTO(cat), ...(names ? {names: {en: names.en, sq: names.sq, de: names.de, fr: names.fr, it: names.it}} : {})};
}

export function categoriesToDTO(categories: IProductCategory[]): Category[] {
    return categories.map(categoryToDTO);
}

/** A populated category reference, named in the reader's language (D195); undefined for an unpopulated id. */
export function categorySimpleToDTO(category: unknown): CategorySimple | undefined {
    if (!category || typeof category !== "object" || !("_id" in category)) return undefined;
    const source = mapSnippet<CategorySimpleSource>()(category, CategorySimpleSnippet);
    return source ? {_id: source._id, name: categoryDisplayName(source), slug: source.slug} : undefined;
}
