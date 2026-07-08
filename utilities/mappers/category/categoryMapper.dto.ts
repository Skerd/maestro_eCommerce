import type {ICategory} from "@eCommerceModule/database/schemas/category/category";
import type {Category} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function categoryToDTO(cat: ICategory | any): Category {
    return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent ? {
            _id: cat.parent._id.toString(),
            name: cat.parent.name,
            slug: cat.parent.slug,
        } : undefined,
        order: cat.order,
        ...mapSoftDeleteToDTO(cat),
        ...mapOwnershipToDTO(cat),
    };
}

export function categoriesToDTO(categories: ICategory[]): Category[] {
    return categories.map(categoryToDTO);
}
