import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ProviderProfileSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.schema-def";
import {createProviderProfileFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/createProviderProfile.form.validator";
import {editProviderProfileFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/editProviderProfile.form.validator";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {ProviderProfileActions} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.actions";
import {
    providerProfileToDTO,
    providerProfilesToDTOArray,
} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMapper.dto";
import {providerProfilesToSelect} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMapper.select";
import {loadProviderProfileMetrics} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMetrics";

const buildCreate = buildCreateDataFromSchemaDef(ProviderProfileSchemaDef, {
    bio: (v) => (typeof v === "string" ? v.trim() : ""),
});
const buildUpdate = buildUpdateDataFromSchemaDef(ProviderProfileSchemaDef, {
    bio: (v) => (typeof v === "string" ? v.trim() : ""),
});

export const basePath = "/api/eCommerceMarketplace/providerProfile";
export const {router} = createCrudRouter({
    collectionName: "providerprofiles",
    model: ProviderProfile,
    service: providerProfileService,
    entityName: "ProviderProfile",
    defaultSort: {createdAt: -1},
    createSchema: createProviderProfileFormSchema,
    editSchema: editProviderProfileFormSchema,
    toDTO: (doc) => providerProfileToDTO(doc)!,
    toDTOArray: providerProfilesToDTOArray,
    toSelect: providerProfilesToSelect,
    documentFilter: async ({company, actionUserCtx, languageCode}) => {
        const base: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.isAdmin) {
            return base;
        }
        const userId = actionUserCtx?.userId;
        if (!userId) {
            throw apiValidationException("unauthorized", null, null, languageCode);
        }
        return {...base, user: new ObjectId(userId)};
    },
    extraListFilter: async ({actionUserCtx}) => {
        if (actionUserCtx?.isAdmin) {
            return {};
        }
        const userId = actionUserCtx?.userId;
        return userId ? {user: new ObjectId(userId)} : {};
    },
    buildCreateData: async (params) => {
        const userId = params.actionUserCtx?.userId;
        if (!userId) {
            throw apiValidationException("unauthorized", null, null, params.languageCode);
        }
        const data = buildCreate(params);
        data.user = new ObjectId(userId);
        if (data.skills === undefined) data.skills = [];
        if (data.bio === undefined) data.bio = "";
        if (data.portfolio === undefined) data.portfolio = [];
        if (data.availability === undefined) data.availability = [];
        return data;
    },
    buildUpdateData: buildUpdate,
    enrichSingle: async (doc, params) => {
        const metrics = await loadProviderProfileMetrics(doc.user?._id ?? doc.user, params.company._id, params);
        return providerProfileToDTO(doc, metrics)!;
    },
    enrichUpdate: async (doc, params) => {
        const metrics = await loadProviderProfileMetrics(doc.user?._id ?? doc.user, params.company._id, params);
        return providerProfileToDTO(doc, metrics)!;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
    // Stripe Connect onboarding: POST /api/eCommerceMarketplace/providerProfile/{createAccountLink|refreshAccountStatus}
    actions: ProviderProfileActions,
});
