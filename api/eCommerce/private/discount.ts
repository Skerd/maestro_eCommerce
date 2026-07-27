import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {DiscountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {createDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/createDiscount.form.validator";
import {editDiscountFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/editDiscount.form.validator";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import {discountService} from "@eCommerceModule/database/schemas/discount/discount.service";
import {DiscountActions} from "@eCommerceModule/database/schemas/discount/discount.actions";
import {
    discountToDTO,
    discountToDTOWithLabels,
    discountsToDTOWithLabels,
} from "@eCommerceModule/utilities/mappers/discount/discountMapper.dto";
import {discountsToSelect} from "@eCommerceModule/utilities/mappers/discount/discountMapper.select";

const discountTransforms = {
    code: (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : v),
    buyXGetY: (v: unknown) => v,
} as const;

const buildDiscountCreateFromSchemaDef = buildCreateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);
const buildDiscountUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);

/** `value` only applies to percentage/fixed; other types always persist 0. */
function shouldZeroDiscountValue(type: unknown): boolean {
    return type === "free_shipping" || type === "buy_x_get_y";
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
    toDTOArray: (docs) => docs.map((d) => discountToDTO(d)),
    toSelect: discountsToSelect,
    buildCreateData: async (params) => {
        const data = buildDiscountCreateFromSchemaDef(params);
        if (shouldZeroDiscountValue(data.type)) data.value = 0;
        data.usageCount = 0;
        if (data.isActive === undefined) data.isActive = true;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildDiscountUpdateFromSchemaDef(params, writeFields);
        // Active state is managed via activate/deactivate actions, not the edit form.
        delete data.isActive;
        if (shouldZeroDiscountValue(params.type ?? data.type)) data.value = 0;
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
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company} = req;
        const {code, subtotal} = req.body;

        if (!code) return res.status(400).json({message: "code required"});

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
            return res.status(404).json({valid: false, message: "discount_not_found"});
        }

        if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) {
            return res.json({valid: false, message: "discount_usage_limit_reached"});
        }

        if (discount.minimumOrderAmount != null && subtotal < discount.minimumOrderAmount) {
            return res.json({valid: false, message: "minimum_order_amount_not_met", minimumOrderAmount: discount.minimumOrderAmount});
        }

        let discountAmount = 0;
        if (discount.type === "percentage") discountAmount = (subtotal * discount.value) / 100;
        else if (discount.type === "fixed") discountAmount = Math.min(discount.value, subtotal);
        else if (discount.type === "free_shipping") discountAmount = 0;

        return res.json({valid: true, discount: await discountToDTOWithLabels(discount), discountAmount});
    }),
);
