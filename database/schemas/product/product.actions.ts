import {ObjectId} from "mongodb";
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
        const {_id: _origId, createdAt, updatedAt, deletedAt, deletedBy, slug: _slug, ...rest} = original.toObject();

        const duplicate = await productService.create(
            {
                ...rest,
                title: `${original.title} (Copy)`,
                status: "draft",
                ratingAverage: 0,
                ratingCount: 0,
                reviewCount: 0,
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

        await productService.updateByIdOrThrow(
            existing._id,
            {status: "draft"},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Product reverted to draft"};
    }
}
