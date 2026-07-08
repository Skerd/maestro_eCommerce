import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/createProduct.form.validator";
import {editProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/editProduct.form.validator";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productToDTO, productsToDTO, productsToSelect} from "@eCommerceModule/utilities/mappers/productMapper.dto";
import {generateUniqueSlug} from "@eCommerceModule/utilities/services/slugGenerationService";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {COLLECTED_DATA} from "@coreModule/database/collections";

const mediaUpload = mediaUploadMW({
    fields: {mainImage: 1, gallery: 20, documents: 20},
    maxFileSize: 250 * 1024 * 1024,
});

function normalizeSeo(seo: any): any {
    if (!seo || typeof seo !== "object") return seo;
    const out = {...seo};
    if (typeof out.openGraphImage === "string" && out.openGraphImage) {
        out.openGraphImage = new ObjectId(out.openGraphImage);
    }
    return out;
}

// SchemaDef is the single source of truth for every field, incl. attributes / specifications /
// faqs (embeddedArray) and seo (embedded). Those four use pass-through transforms so the builders
// write them wholesale (bypassing per-item write-permission recursion); seo additionally coerces
// its openGraphImage mediaId string -> ObjectId. Only slug (derived from title) is applied on top.
const productTransforms = {
    attributes: (v: unknown) => v,
    specifications: (v: unknown) => v,
    faqs: (v: unknown) => v,
    seo: (v: unknown) => normalizeSeo(v),
} as const;
const buildProductCreateFromSchemaDef = buildCreateDataFromSchemaDef(ProductSchemaDef, productTransforms);
const buildProductUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(ProductSchemaDef, productTransforms);

export const basePath = "/api/eCommerce/product";
export const {router} = createCrudRouter({
    collectionName: "products",
    model: Product,
    service: productService,
    entityName: "Product",
    selectSearchField: "title",
    defaultSort: {createdAt: -1},
    createSchema: createProductFormSchema,
    editSchema: editProductFormSchema,
    toDTO: productToDTO,
    toDTOArray: productsToDTO,
    toSelect: productsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    extraListFilter: async ({status, type, categories, collection, brand, featured, availableForSale, onSale}) => {
        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (categories) filter.categories = new ObjectId(categories as string);
        if (collection) filter.collections = new ObjectId(collection as string);
        if (brand) filter.brand = brand;
        if (featured !== undefined) filter.featured = featured === true || featured === "true";
        if (availableForSale !== undefined) filter.availableForSale = availableForSale === true || availableForSale === "true";
        if (onSale === true || onSale === "true") {
            const now = new Date();
            filter.saleStartsAt = {$lte: now};
            filter.saleEndsAt = {$gte: now};
        }
        return filter;
    },
    buildCreateData: async (params) => {
        const data = buildProductCreateFromSchemaDef(params);
        data.slug = await generateUniqueSlug(params.title, Product, params.company._id);
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const update = buildProductUpdateFromSchemaDef(params, writeFields);
        if (params.title !== undefined && writeFields.title) {
            update.slug = await generateUniqueSlug(
                params.title,
                Product,
                params.company._id,
                params._id ? new ObjectId(params._id as string) : undefined,
            );
        }
        return update;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

// Duplicate product
router.post(
    "/duplicate",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, actionUserCtx, company} = req;
        const {productId} = req.body;
        if (!productId) return res.status(400).json({message: "productId required"});

        const sanitizedFields = SchemaGuard.sanitizeFields(Product, COLLECTED_DATA.products?.readFields ?? [], "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Product.schema);

        const original = await productService.findOneOrThrow(
            {_id: new ObjectId(productId), company: company._id},
            {logger, languageCode},
            populate.populate,
            populate.select || "",
        );

        const newTitle = `${original.title} (Copy)`;
        const newSlug = await generateUniqueSlug(newTitle, Product, company._id);

        const {_id, createdAt, updatedAt, deletedAt, deletedBy, ...rest} = (original as any).toObject();
        const duplicate = await productService.create(
            {
                ...rest,
                title: newTitle,
                slug: newSlug,
                status: "draft",
                ratingAverage: 0,
                ratingCount: 0,
                reviewCount: 0,
            },
            {logger, languageCode, session: undefined},
        );

        return res.json({data: productToDTO(duplicate)});
    }),
);

// Search products (full-text)
router.get(
    "/search",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, actionUserCtx, company} = req;
        const {q, page = 1, limit = 20} = req.query;

        if (!q) return res.json({data: [], total: 0});

        const filter: Record<string, unknown> = {
            company: company._id,
            $text: {$search: String(q)},
        };

        const sanitizedFields = SchemaGuard.sanitizeFields(Product, COLLECTED_DATA.products?.readFields ?? [], "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Product.schema);

        const pageNum = Math.max(1, parseInt(String(page), 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

        const [products, total] = await Promise.all([
            productService.find(filter, {logger, languageCode}, populate.populate, populate.select || "", {score: {$meta: "textScore"}}, limitNum, (pageNum - 1) * limitNum),
            productService.count(filter, {logger, languageCode}),
        ]);

        return res.json({data: productsToDTO(products), total, page: pageNum, limit: limitNum});
    }),
);
