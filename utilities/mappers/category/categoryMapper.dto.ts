import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {Category} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";

export function categoryToDTO(cat: IProductCategory | any): Category {
    return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        parent: mapSnippet<CategorySimple>()(cat.parent, CategorySimpleSnippet),
        order: cat.order,
        ...mapSoftDeleteToDTO(cat),
        ...mapOwnershipToDTO(cat),
        ...mapLifeCycleToDTO(cat),
    };
}

export function categoriesToDTO(categories: IProductCategory[]): Category[] {
    return categories.map(categoryToDTO);
}
