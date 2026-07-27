import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {z} from "zod";
import GiftCard from "@eCommerceModule/database/schemas/giftCard/giftCard";
import {giftCardService} from "@eCommerceModule/database/schemas/giftCard/giftCard.service";
import {giftCardToDTO, giftCardsToDTO, giftCardsToSelect} from "@eCommerceModule/utilities/mappers/giftCardMapper.dto";
import {GiftCardActions} from "@financeModule/database/schemas/giftCard/giftCard.actions";

function giftCardListSchema(_lang: string) {
    return z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        code: z.string().max(50).optional(),
        status: z.enum(["active", "depleted", "disabled"]).optional(),
        purchasedById: z.string().optional(),
    });
}

/**
 * Gift cards are system-issued and balance mutations happen only through
 * giftCardService.redeemAmount — the panel reads, and enables/disables via
 * actions (write rate kept low, no create).
 */
export const basePath = "/api/eCommerce/giftCard";
export const {router} = createCrudRouter({
    collectionName: "giftCards",
    model: GiftCard,
    service: giftCardService,
    entityName: "GiftCard",
    defaultSort: {createdAt: -1},
    selectSearchField: "code",
    listSchema: giftCardListSchema,
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string(), status: z.enum(["active", "disabled"]).optional()}),
    toDTO: giftCardToDTO,
    toDTOArray: giftCardsToDTO,
    toSelect: giftCardsToSelect,
    extraListFilter: async ({code, status, purchasedById}) => {
        const filter: Record<string, unknown> = {};
        if (code && typeof code === "string" && code.trim()) filter.code = {$regex: code.trim().toUpperCase(), $options: "i"};
        if (status) filter.status = status;
        if (purchasedById) filter.purchasedBy = new ObjectId(purchasedById as string);
        return filter;
    },
    buildCreateData: async () => ({}),
    // Only enabling/disabling is admin-writable; balances never are
    buildUpdateData: async ({status}, writeFields) => {
        const update: Record<string, unknown> = {};
        if (status !== undefined && (writeFields as any).status) update.status = status;
        return update;
    },
    actions: GiftCardActions,
    rateLimits: {read: 60, write: 10, delete: 10},
});

/**
 * The signed-in buyer's own gift cards (storefront account page) — scoped
 * hard to purchasedBy, no admin model permissions required.
 */
router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;

        const cards = await GiftCard.find({
            company: company._id,
            purchasedBy: new ObjectId(actionUserCtx.userId),
            deletedAt: null,
        })
            .select("code initialBalance balance status expiresAt createdAt")
            .sort({createdAt: -1})
            .limit(100)
            .lean();

        return {
            data: cards.map((card: any) => ({
                _id: card._id.toString(),
                code: card.code,
                initialBalance: card.initialBalance,
                balance: card.balance,
                status: card.status,
                expiresAt: card.expiresAt ? new Date(card.expiresAt).toISOString() : undefined,
                createdAt: card.createdAt ? new Date(card.createdAt).toISOString() : undefined,
            })),
        };
    }),
);
