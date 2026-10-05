import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import type {Discount, DiscountRef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.dto";
import {dateToISOString, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {loadNamedRefs} from "@eCommerceModule/utilities/mappers/helpers/namedRefs";

function ids(values: unknown[] | undefined): string[] | undefined {
    if (!values) return undefined;
    return values.map((v: any) => objectIdToString(v?._id ?? v));
}

function withTitle(refs: {_id: string; name: string}[]): DiscountRef[] {
    return refs.map((r) => ({_id: r._id, name: r.name, title: r.name}));
}

/** Polymorphic `targetIds` — resolve names by `appliesTo` (no single mongoose ref). */
async function loadTargets(discount: IDiscount): Promise<DiscountRef[]> {
    const {appliesTo, targetIds} = discount;
    if (!targetIds?.length) return [];
    if (appliesTo === "product") return withTitle(await loadNamedRefs(Product as any, targetIds as any, "title"));
    if (appliesTo === "collection") return loadNamedRefs(ProductCollection as any, targetIds as any, "name");
    if (appliesTo === "category") return loadNamedRefs(ProductCategory as any, targetIds as any, "name");
    return [];
}

function buildDiscountDTO(
    discount: IDiscount,
    targets: DiscountRef[],
    customerGroupRefs: DiscountRef[],
    getProducts: DiscountRef[],
): Discount {
    const {appliesTo} = discount;
    return {
        _id: discount._id.toString(),
        type: discount.type,
        title: discount.title,
        code: discount.code,
        value: discount.value,
        appliesTo,
        targetIds: ids(discount.targetIds as any),
        targets,
        productTargets: appliesTo === "product" ? targets : [],
        collectionTargets: appliesTo === "collection" ? targets : [],
        categoryTargets: appliesTo === "category" ? targets : [],
        minimumOrderAmount: discount.minimumOrderAmount,
        minimumQuantity: discount.minimumQuantity,
        usageLimit: discount.usageLimit,
        usageLimitPerCustomer: discount.usageLimitPerCustomer,
        usageCount: discount.usageCount,
        customerGroups: ids(discount.customerGroups as any),
        customerGroupRefs,
        isActive: discount.isActive,
        startsAt: dateToISOString(discount.startsAt),
        endsAt: dateToISOString(discount.endsAt) || undefined,
        buyXGetY: discount.buyXGetY
            ? {
                  buyQuantity: discount.buyXGetY.buyQuantity,
                  getQuantity: discount.buyXGetY.getQuantity,
                  getProductIds: ids(discount.buyXGetY.getProductIds as any) ?? [],
                  getProducts,
              }
            : undefined,
        ...(discount.type !== "buy_x_get_y" ? {hasOfferScoping: true as const} : {}),
        ...(discount.type === "percentage" ? {hasPercentageValue: true as const} : {}),
        ...(discount.type === "fixed" ? {hasFixedValue: true as const} : {}),
        ...mapSoftDeleteToDTO(discount),
        ...mapOwnershipToDTO(discount),
        ...mapLifeCycleToDTO(discount),
    };
}

/** Sync create-response path — chip labels come from `discountToDTOWithLabels` (enrich). */
export function discountToDTO(discount: IDiscount): Discount {
    return buildDiscountDTO(discount, [], [], []);
}

export async function discountToDTOWithLabels(discount: IDiscount): Promise<Discount> {
    const [targets, customerGroupRefs, getProducts] = await Promise.all([
        loadTargets(discount),
        loadNamedRefs(CustomerGroup as any, discount.customerGroups as any, "name"),
        loadNamedRefs(Product as any, discount.buyXGetY?.getProductIds as any, "title").then(withTitle),
    ]);
    return buildDiscountDTO(discount, targets, customerGroupRefs, getProducts);
}

export async function discountsToDTOWithLabels(discounts: IDiscount[]): Promise<Discount[]> {
    return Promise.all(discounts.map(discountToDTOWithLabels));
}

export function discountsToDTO(discounts: IDiscount[]): Discount[] {
    return discounts.map(discountToDTO);
}
