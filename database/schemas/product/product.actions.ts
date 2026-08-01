import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {Product as ProductDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import {productToDTO} from "@eCommerceModule/utilities/mappers/product/productMapper.dto";
import Product from "./product";
import {productService} from "./product.service";

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
        const {_id: _origId, createdAt, updatedAt, deletedAt, deletedBy, slug: _slug, ...rest} = (original as any).toObject();

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
}
