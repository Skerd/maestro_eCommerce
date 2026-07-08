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
import {discountToDTO, discountsToDTO, discountToSelect, discountsToSelect} from "@eCommerceModule/utilities/mappers/discountMapper.dto";

const discountTransforms = {
    code: (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : v),
    buyXGetY: (v: unknown) => v,
} as const;

const buildDiscountCreateFromSchemaDef = buildCreateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);
const buildDiscountUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(DiscountSchemaDef, discountTransforms);

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
        data.usageCount = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => buildDiscountUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
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

        return res.json({valid: true, discount: discountToDTO(discount), discountAmount});
    }),
);
