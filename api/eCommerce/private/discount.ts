import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {DiscountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {createDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/createDiscount.form.validator";
import {editDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/editDiscount.form.validator";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import {discountService} from "@eCommerceModule/database/schemas/discount/discount.service";
import {DiscountActions} from "@eCommerceModule/database/schemas/discount/discount.actions";
import {
    discountToDTO,
    discountsToDTO,
    discountToDTOWithLabels,
    discountsToDTOWithLabels,
} from "@eCommerceModule/utilities/mappers/discount/discountMapper.dto";
import {discountsToSelect} from "@eCommerceModule/utilities/mappers/discount/discountMapper.select";
import {
    validateDiscount,
    type CartForValidation,
} from "@eCommerceModule/utilities/services/discountValidationService";
import {ObjectId} from "mongodb";

const discountTransforms = {
    code: (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : v),
} as const;

const buildDiscountCreateFromSchemaDef = buildCreateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);
const buildDiscountUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);

function isBuyXGetYConfigured(buyXGetY: unknown): boolean {
    if (!buyXGetY || typeof buyXGetY !== "object") return false;
    const bx = buyXGetY as {buyQuantity?: unknown; getQuantity?: unknown; getProductIds?: unknown};
    const buyOk = typeof bx.buyQuantity === "number" && bx.buyQuantity >= 1 && !Number.isNaN(bx.buyQuantity);
    const getOk = typeof bx.getQuantity === "number" && bx.getQuantity >= 1 && !Number.isNaN(bx.getQuantity);
    const productsOk = Array.isArray(bx.getProductIds) && bx.getProductIds.length >= 1;
    return buyOk && getOk && productsOk;
}

/** Persist product-only BXGY shape; strip stale buyXGetY for other types. */
function normalizeDiscountTypeFields(
    data: Record<string, any>,
    type: unknown,
    languageCode: string,
    mode: "create" | "update",
): void {
    if (type === "buy_x_get_y") {
        data.appliesTo = "product";
        data.value = 0;
        data.targetIds = [];
        if (!isBuyXGetYConfigured(data.buyXGetY)) {
            throw apiValidationException("buy_x_get_y_misconfigured", "buyXGetY", null, languageCode);
        }
        return;
    }

    if (type === "free_shipping") {
        data.value = 0;
    }

    if (type != null && type !== "buy_x_get_y") {
        if (mode === "update") data.buyXGetY = null;
        else delete data.buyXGetY;
    }
}

function parseValidateItems(raw: unknown): CartForValidation["items"] {
    if (!Array.isArray(raw)) return [];
    const items: CartForValidation["items"] = [];
    for (const row of raw) {
        if (!row || typeof row !== "object") continue;
        const productRaw = (row as any).productId ?? (row as any).product;
        if (productRaw == null) continue;
        const productId = productRaw instanceof ObjectId ? productRaw : new ObjectId(String(productRaw._id ?? productRaw));
        const quantity = Number((row as any).quantity);
        const unitPrice = Number((row as any).unitPrice);
        if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice)) continue;
        const item: CartForValidation["items"][number] = {productId, quantity, unitPrice};
        const variantRaw = (row as any).variantId ?? (row as any).variant;
        if (variantRaw != null) {
            item.variantId = variantRaw instanceof ObjectId ? variantRaw : new ObjectId(String(variantRaw._id ?? variantRaw));
        }
        items.push(item);
    }
    return items;
}

export const basePath = "/api/eCommerce/discount";
export const {router} = createCrudRouter({
    collectionName: "discounts",
    model: Discount,
    service: discountService,
    entityName: "Discount",
    selectSearchField: "title",
    defaultSort: {createdAt: -1},
    createSchema: createDiscountFormSchema,
    editSchema: editDiscountFormSchema,
    toDTO: discountToDTO,
    toDTOArray: discountsToDTO,
    toSelect: discountsToSelect,
    buildCreateData: async (params) => {
        const data = buildDiscountCreateFromSchemaDef(params);
        normalizeDiscountTypeFields(data, data.type, params.languageCode, "create");
        data.usageCount = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildDiscountUpdateFromSchemaDef(params, writeFields);
        const type = params.type ?? data.type ?? params.existing?.type;
        // Ensure BXGY nested payload is available when type is BXGY (may live on params only).
        if (type === "buy_x_get_y" && data.buyXGetY == null && params.buyXGetY != null) {
            data.buyXGetY = params.buyXGetY;
        }
        normalizeDiscountTypeFields(data, type, params.languageCode, "update");
        return data;
    },
    actions: DiscountActions,
    rateLimits: {read: 60, write: 30, delete: 20},
    enrichList: async (docs) => discountsToDTOWithLabels(docs),
    enrichSingle: async (doc) => discountToDTOWithLabels(doc),
    enrichUpdate: async (doc) => discountToDTOWithLabels(doc),
});

router.post(
    "/validate",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, code, subtotal, items: rawItems} = params;

        // Staff tool: reveals the discount's configuration, so it needs read access to it
        const readable = SchemaGuard.sanitizeFields(Discount, {code: {}, value: {}}, "read", actionUserCtx, languageCode);
        if (!readable.code || !readable.value) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        if (!code) throw apiValidationException("code_required", "code", null, languageCode);

        const now = new Date();
        const discount = await discountService.findOne(
            {
                company: company._id,
                code: String(code).trim().toUpperCase(),
                isActive: true,
                startsAt: {$lte: now},
                $or: [{endsAt: null}, {endsAt: {$gte: now}}],
            },
            {logger, languageCode},
        );

        if (!discount) {
            return {valid: false, message: "discount_not_found"};
        }

        const items = parseValidateItems(rawItems);
        if (discount.type === "buy_x_get_y" && items.length === 0) {
            return {valid: false, message: "buy_x_get_y_items_required"};
        }

        const result = validateDiscount({subtotal: Number(subtotal) || 0, items}, discount);

        if (result.valid === false) {
            return {valid: false, message: result.reason};
        }

        return {
            valid: true,
            discount: await discountToDTOWithLabels(discount),
            discountAmount: result.discountAmount,
        };
    }),
);
