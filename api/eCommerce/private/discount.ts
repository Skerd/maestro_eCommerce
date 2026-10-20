import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {DiscountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {createDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/createDiscount.form.validator";
import {editDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/editDiscount.form.validator";
import {
    validateDiscountFormSchema,
    type ValidateDiscountFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/validateDiscount.form.validator";
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
import {restoreUnlessKeyTaken} from "@coreModule/api/restoreUnlessKeyTaken";

const discountTransforms = {
    code: (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : v),
} as const;

const buildDiscountCreateFromSchemaDef = buildCreateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);
const buildDiscountUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);

/**
 * Persist type-dependent shape. Cross-field BXGY presence is enforced by
 * `refineBuyXGetY` on create/edit — this only mutates stored fields.
 */
function normalizeDiscountTypeFields(
    data: Record<string, unknown>,
    type: unknown,
    mode: "create" | "update",
): void {
    if (type === "buy_x_get_y") {
        data.appliesTo = "product";
        data.value = 0;
        data.targetIds = [];
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

function toValidationCart(form: ValidateDiscountFormType): CartForValidation {
    const items: CartForValidation["items"] = (form.items ?? []).map((row) => ({
        productId: new ObjectId(row.productId),
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        ...(row.variantId ? {variantId: new ObjectId(row.variantId)} : {}),
        ...(row.categoryIds?.length ? {categoryIds: row.categoryIds} : {}),
        ...(row.collectionIds?.length ? {collectionIds: row.collectionIds} : {}),
    }));
    return {subtotal: form.subtotal ?? 0, items};
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
        normalizeDiscountTypeFields(data, data.type, "create");
        data.usageCount = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildDiscountUpdateFromSchemaDef(params, writeFields);
        const type = params.type ?? data.type ?? params.existing.type;
        // Nested BXGY can be present on params but omitted from SchemaDef update when
        // write allowlist is a boolean rather than `{keys:…}`.
        if (type === "buy_x_get_y" && data.buyXGetY == null && params.buyXGetY != null) {
            data.buyXGetY = params.buyXGetY;
        }
        normalizeDiscountTypeFields(data, type, "update");
        return data;
    },
    actions: DiscountActions,
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: Discount,
        service: discountService,
        entityName: "Discount",
        keys: ["code"],
        errorCode: "discount_already_exists",
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
    enrichList: async (docs) => discountsToDTOWithLabels(docs),
    enrichSingle: async (doc) => discountToDTOWithLabels(doc),
    enrichUpdate: async (doc) => discountToDTOWithLabels(doc),
});

router.post(
    "/validate",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod((languageCode, form) => validateDiscountFormSchema(languageCode ?? "en-US", form)),
    asyncHandler(async (params: AuthenticatedMWType & ValidateDiscountFormType) => {
        const {logger, languageCode, company, actionUserCtx, code} = params;

        // Staff tool: reveals the discount's configuration, so it needs read access to it
        const readable = SchemaGuard.sanitizeFields(Discount, {code: {}, value: {}}, "read", actionUserCtx, languageCode);
        if (!readable.code || !readable.value) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        const now = new Date();
        const discount = await discountService.findOne(
            {
                company: company._id,
                code: code.trim().toUpperCase(),
                isActive: true,
                startsAt: {$lte: now},
                $or: [{endsAt: null}, {endsAt: {$gte: now}}],
            },
            {logger, languageCode},
        );

        if (!discount) {
            return {valid: false, message: "discount_not_found"};
        }

        const cart = toValidationCart(params);
        if (discount.type === "buy_x_get_y" && cart.items.length === 0) {
            return {valid: false, message: "buy_x_get_y_items_required"};
        }

        const result = validateDiscount(cart, discount);

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
