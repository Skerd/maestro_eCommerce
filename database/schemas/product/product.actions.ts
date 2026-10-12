import {ObjectId} from "mongodb";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import type {Product as ProductDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import {productToDTO} from "@eCommerceModule/utilities/mappers/product/productMapper.dto";
import Product from "./product";
import {productService} from "./product.service";

function assertStatusWrite(params: Record<string, any>) {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        Product,
        getModelCollectedData("products").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.status) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

/**
 * An active product is sold at its price (variants fall back to it), so it can't
 * go on sale without one unless its variants carry their own prices.
 */
export function assertPricedWhenActive(
    product: {status?: string; price?: number | string | null; hasVariants?: boolean},
    languageCode: string,
): void {
    const unpriced = product.price == null || product.price === "";
    if (product.status === "active" && unpriced && !product.hasVariants) {
        throw apiValidationException("product_price_required", "price", null, languageCode);
    }
}

/**
 * A bundle is exploded one level deep when stock moves, so each component must
 * be another live product of the company that is not itself a bundle.
 */
export async function assertValidBundle(
    product: {_id?: unknown; type?: string; bundleComponents?: {product: unknown}[]},
    params: Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode">,
): Promise<void> {
    if (product.type !== "bundle" || !product.bundleComponents?.length) return;
    const {company, session, logger, languageCode} = params;
    const componentIds = product.bundleComponents.map(component => nestedEntityToRef(component.product));
    const selfId = nestedEntityToRef(product._id)?.toString();
    const components = await productService.find(
        {_id: {$in: componentIds}, company: company._id, type: {$ne: "bundle"}},
        {session, logger, languageCode, withDeleted: false},
        undefined,
        "_id",
    );
    const valid = new Set(components.map(component => component._id.toString()));
    if (componentIds.some(id => !id || id.toString() === selfId || !valid.has(id.toString()))) {
        throw apiValidationException("bundle_component_invalid", "bundleComponents", null, languageCode);
    }
}

export class ProductActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        schema: validateSingleForm,
        transaction: true,
    })
    async duplicate(params: Record<string, any>): Promise<ProductDto> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        SchemaGuard.checkModelPermission(Product, "create", actionUserCtx, languageCode);

        const original = await productService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        // Omit slug so Product pre-save derives a unique slug from the new title.
        // Omit child id lists so the copy does not share variants / stock / reviews.
        // Omit publishedAt: a draft copy with a past date would be auto-published by the scheduled-publish job.
        const {
            _id: _origId,
            createdAt,
            updatedAt,
            deletedAt,
            deletedBy,
            slug: _slug,
            publishedAt: _publishedAt,
            variants: _variants,
            inventories: _inventories,
            reviews: _reviews,
            defaultVariant: _defaultVariant,
            ...rest
        } = original.toObject();

        const duplicate = await productService.create(
            {
                ...rest,
                title: `${original.title} (Copy)`,
                status: "draft",
                ratingAverage: 0,
                ratingCount: 0,
                reviewCount: 0,
                hasVariants: false,
                variantCount: 0,
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return productToDTO(duplicate);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async publish(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);

        const existing = await productService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "draft") {
            throw apiValidationException("product_not_draft", "", null, languageCode);
        }
        assertPricedWhenActive({...existing.toObject(), status: "active"}, languageCode);

        const $set: Record<string, unknown> = {status: "active"};
        if (!existing.publishedAt) {
            $set.publishedAt = new Date();
        }

        await productService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        return {message: "Product published"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async archive(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);

        const existing = await productService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "draft" && existing.status !== "active") {
            throw apiValidationException("product_cannot_archive", "", null, languageCode);
        }

        await productService.updateByIdOrThrow(
            existing._id,
            {status: "archived"},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Product archived"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async revertToDraft(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);

        const existing = await productService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "archived") {
            throw apiValidationException("product_not_archived", "", null, languageCode);
        }

        // Clear publishedAt so the scheduled-publish job doesn't put the product straight back on sale
        await productService.updateByIdOrThrow(
            existing._id,
            {status: "draft", publishedAt: null},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Product reverted to draft"};
    }
}
