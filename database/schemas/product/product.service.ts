import type {FilterQuery, PopulateOptions} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Product, {IProduct} from "@eCommerceModule/database/schemas/product/product";

/** One page of a read-only catalog query. */
export type CatalogPage = {select: string; populate: PopulateOptions[]; sort: Record<string, 1 | -1>; skip: number; limit: number};

const SHOP_RATING_PROJECTION = {ratingAverage: 1, ratingCount: 1, company: 1};

export class ProductService extends BaseCrudService<IProduct, typeof Product> {
    constructor() {
        super(Product, "Product");
    }

    /** A live product's rating summary and seller, for the storefront reviews. */
    findShopRating(filter: FilterQuery<IProduct>) {
        return Product.findOne(filter, SHOP_RATING_PROJECTION).noDeleted().lean();
    }

    findShopRatings(filter: FilterQuery<IProduct>) {
        return Product.find(filter, SHOP_RATING_PROJECTION).noDeleted().lean();
    }

    /**
     * Live rows as plain objects for read-only catalog pages (the portal), typed by the caller's projection.
     * One page, sorted, with the given references populated.
     */
    findCatalogRows<Row>(filter: FilterQuery<IProduct>, page: CatalogPage) {
        return Product.find(filter).noDeleted()
            .select(page.select)
            .populate(page.populate)
            .sort(page.sort)
            .skip(page.skip).limit(page.limit)
            .lean<Row[]>();
    }
}

export const productService = new ProductService();
