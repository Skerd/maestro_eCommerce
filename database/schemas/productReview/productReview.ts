import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ProductReviewSchemaDef, PRODUCT_REVIEW_TITLE_MAX, PRODUCT_REVIEW_COMMENT_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.schema-def";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {applyProductReviewIndexes} from "./productReview.indexes";
import {productReviewViews} from "./productReview.views";

/**
 * Product-commerce review: one per paid order line. Aggregates into
 * product.ratingAverage / ratingCount / reviewCount — kept separate from the
 * marketplace Review (listing/gig reviews).
 *
 * Order, product, and reviewer stay write-locked after create. The reviewer
 * is set from the order's customer and is not part of the form. Rating, title,
 * and comment can be edited.
 */
export interface IProductReview extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    order: IProductOrder;
    product: IProduct;
    rating: number;
    title?: string;
    comment?: string;
    reviewer: IUser;
}

const NoWritePermission = {
    self: {
        write: "no-permission",
    },
    others: {
        write: "no-permission",
    },
};

const ProductReviewSchema = new Schema<IProductReview>(
    {
        order: {
            type: SchemaTypes.ObjectId,
            ref: "ProductOrder",
            required: true,
            refAllowlist: ProductOrderSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["orderNumber"],
            },
        },
        product: {
            type: SchemaTypes.ObjectId,
            ref: "Product",
            required: true,
            refAllowlist: ProductSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["title"],
            },
        },
        rating: {
            type: SchemaTypes.Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_REVIEW_TITLE_MAX,
        },
        comment: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_REVIEW_COMMENT_MAX,
        },
        reviewer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(ProductReviewSchema);
auditPlugin(ProductReviewSchema);
softDeletePlugin(ProductReviewSchema);
applyProductReviewIndexes(ProductReviewSchema);
lifeCyclePlugin(ProductReviewSchema);
const ProductReview = model<IProductReview>("ProductReview", ProductReviewSchema);
normalizeSchemaPermissions(ProductReview);
export default ProductReview;

addModelData(ProductReview, productReviewViews);
validateSchemaDefAgainstMongoose(ProductReviewSchema, ProductReviewSchemaDef, "ProductReview");
