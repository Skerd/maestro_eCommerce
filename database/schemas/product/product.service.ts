import type {ClientSession, FilterQuery} from "mongoose";
import type {ObjectId} from "mongodb";
import {BaseCrudService, type CatalogPage} from "@coreModule/database/services/baseCrudService";
import Product, {IProduct} from "@eCommerceModule/database/schemas/product/product";

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

    /** A live product as the platform's report desk reads it (D191): by its id alone, whichever shop owns it. */
    findReportable(id: ObjectId, session?: ClientSession) {
        return this.model.findOne({_id: id, deletedAt: null})
            .select("company title slug hiddenByPlatform")
            .session(session ?? null)
            .lean<{_id: ObjectId; company: ObjectId; title: string; slug?: string; hiddenByPlatform?: boolean}>();
    }
}

export const productService = new ProductService();
