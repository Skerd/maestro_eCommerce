import type {ObjectId} from "mongodb";
import type {ReportableDefinition} from "@coreModule/domain/reports/reportables";
import {portalCompanyRefs} from "@coreModule/utilities/marketing/portalCompanies";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {refreshProductRating} from "@eCommerceModule/workflows/productRating";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import {PRODUCT_REVIEW_REPORT_KIND} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";

/** How much of a review's words the report desk shows as its title. */
const REVIEW_EXCERPT_MAX = 80;

/** A product's page on the portal, inside its shop (`sitePath` and item path of the shop portal provider). */
async function productPath(product: {_id: ObjectId; company: ObjectId; slug?: string}): Promise<string | undefined> {
    const company = (await portalCompanyRefs([product.company])).get(product.company.toString());
    if (!company) return undefined;
    const query = new URLSearchParams({id: product._id.toString(), ...(product.slug ? {slug: product.slug} : {}), seller: product.company.toString()});
    return `/shop/${company.slug}/product?${query}`;
}

/** A review as the report desk names it: its stars and its title or the start of its words. */
function reviewTitle(review: {rating: number; title?: string; comment?: string}): string {
    const words = (review.title || review.comment)?.trim() ?? "";
    const excerpt = words.length > REVIEW_EXCERPT_MAX ? `${words.slice(0, REVIEW_EXCERPT_MAX - 1)}…` : words;
    return `${"★".repeat(review.rating)} ${excerpt}`.trim();
}

/**
 * What people can report to the platform about shops (D191): a product the portal and the shop show, and a buyer's
 * review of one. Hiding either takes it off every public page and search; hiding a review also takes it out of the
 * product's stored rating.
 */
export const eCommerceReportables: ReportableDefinition[] = [
    {
        kind: "eCommerce.product",
        typeLabel: {
            "en-US": "Product",
            "de-CH": "Produkt",
            "fr-FR": "Produit",
            "it-IT": "Prodotto",
            "sq-AL": "Produkt",
        },
        snapshot: async ({recordId, session}) => {
            const product = await productService.findReportable(recordId, session);
            if (!product) return null;
            return {
                title: product.title,
                companyId: product.company,
                url: await productPath(product),
                hidden: product.hiddenByPlatform === true,
            };
        },
        model: Product,
    },
    {
        kind: PRODUCT_REVIEW_REPORT_KIND,
        typeLabel: {
            "en-US": "Product review",
            "de-CH": "Produktbewertung",
            "fr-FR": "Avis sur un produit",
            "it-IT": "Recensione di un prodotto",
            "sq-AL": "Vlerësim produkti",
        },
        snapshot: async ({recordId, session}) => {
            const review = await productReviewService.findReportable(recordId, session);
            if (!review) return null;
            const product = await productService.findReportable(review.product, session);
            return {
                title: reviewTitle(review),
                companyId: review.company,
                authorAccountId: review.reviewer,
                url: product ? await productPath(product) : undefined,
                hidden: review.hiddenByPlatform === true,
            };
        },
        model: ProductReview,
        // The product stores its rating, so it is counted again without (or with) the review.
        onHidden: async ({recordId, session, logger, languageCode}) => {
            const review = await productReviewService.findById(recordId, {session}, null, "product");
            const productId = nestedEntityToRef(review?.product);
            if (productId) await refreshProductRating(productId, {session, logger, languageCode});
        },
    },
];
