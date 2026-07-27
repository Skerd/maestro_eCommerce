import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import type {Discount} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.dto";
import {
    dateToISOString,
    mapPopulatedRef,
    objectIdToString,
} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {loadNamedRefs, type NamedRef} from "@eCommerceModule/utilities/mappers/helpers/namedRefs";

export async function resolveDiscountRefs(discount: IDiscount): Promise<{
    targets: NamedRef[];
    customerGroupRefs: NamedRef[];
    getProducts: NamedRef[];
}> {
    const [customerGroupRefs, getProducts, targets] = await Promise.all([
        loadNamedRefs(CustomerGroup as any, discount.customerGroups as any, "name"),
        loadNamedRefs(Product as any, discount.buyXGetY?.getProductIds as any, "title"),
        (async () => {
            const ids = discount.targetIds as any;
            if (!ids?.length) return [] as NamedRef[];
            if (discount.appliesTo === "product") return loadNamedRefs(Product as any, ids, "title");
            if (discount.appliesTo === "collection") return loadNamedRefs(ProductCollection as any, ids, "name");
            if (discount.appliesTo === "category") return loadNamedRefs(ProductCategory as any, ids, "name");
            return [];
        })(),
    ]);

    return {targets, customerGroupRefs, getProducts};
}

export function discountToDTO(
    discount: IDiscount,
    refs?: {
        targets?: NamedRef[];
        customerGroupRefs?: NamedRef[];
        getProducts?: NamedRef[];
    },
): Discount {
    const targets = refs?.targets ?? [];
    const getProducts = refs?.getProducts ?? [];
    const appliesTo = discount.appliesTo;

    return {
        _id: discount._id.toString(),
        type: discount.type,
        title: discount.title,
        code: discount.code,
        value: discount.value,
        appliesTo,
        targetIds: discount.targetIds?.map((id: any) => objectIdToString(id?._id ?? id)),
        targets,
        productTargets: appliesTo === "product" ? targets.map((r) => ({_id: r._id, name: r.name, title: r.name})) : [],
        collectionTargets: appliesTo === "collection" ? targets : [],
        categoryTargets: appliesTo === "category" ? targets : [],
        minimumOrderAmount: discount.minimumOrderAmount,
        minimumQuantity: discount.minimumQuantity,
        usageLimit: discount.usageLimit,
        usageLimitPerCustomer: discount.usageLimitPerCustomer,
        usageCount: discount.usageCount,
        customerGroups: discount.customerGroups?.map((id: any) => objectIdToString(id?._id ?? id)),
        customerGroupRefs: refs?.customerGroupRefs ?? [],
        isActive: discount.isActive,
        startsAt: dateToISOString(discount.startsAt),
        endsAt: dateToISOString(discount.endsAt) || undefined,
        buyXGetY: discount.buyXGetY
            ? {
                  buyQuantity: discount.buyXGetY.buyQuantity,
                  getQuantity: discount.buyXGetY.getQuantity,
                  getProductIds: discount.buyXGetY.getProductIds?.map((id: any) => objectIdToString(id?._id ?? id)) ?? [],
                  getProducts: getProducts.map((r) => ({_id: r._id, name: r.name, title: r.name}))
              }
            : undefined,
        company: mapPopulatedRef(discount.company as any),
        ...mapSoftDeleteToDTO(discount),
        ...mapOwnershipToDTO(discount),
        ...mapLifeCycleToDTO(discount),
    };
}

export async function discountToDTOWithLabels(discount: IDiscount): Promise<Discount> {
    return discountToDTO(discount, await resolveDiscountRefs(discount));
}

export async function discountsToDTOWithLabels(discounts: IDiscount[]): Promise<Discount[]> {
    return Promise.all(discounts.map(discountToDTOWithLabels));
}

export function discountsToDTO(discounts: IDiscount[]): Discount[] {
    return discounts.map((d) => discountToDTO(d));
}
