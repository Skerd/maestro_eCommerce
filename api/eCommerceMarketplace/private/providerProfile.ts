import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {
    ProviderProfileSchemaDef,
    type CreateProviderProfileFormType,
    type EditProviderProfileFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.schema-def";
import {createProviderProfileFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/createProviderProfile.form.validator";
import {editProviderProfileFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/editProviderProfile.form.validator";
import {providerProfileFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.form.validator";
import {userService} from "@coreModule/database/schemas/user/user.service";
import ProviderProfile, {type IProviderProfile} from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {ProviderProfileActions} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.actions";
import {
    providerProfileToDTO,
    providerProfilesToDTOArray,
} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMapper.dto";
import {providerProfilesToSelect} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMapper.select";
import {loadProviderProfileMetrics} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMetrics";
import {restoreUnlessKeyTaken} from "@coreModule/api/restoreUnlessKeyTaken";

const buildCreate = buildCreateDataFromSchemaDef(ProviderProfileSchemaDef);
const buildUpdate = buildUpdateDataFromSchemaDef(ProviderProfileSchemaDef);

export const basePath = "/api/eCommerceMarketplace/providerProfile";
export const {router} = createCrudRouter<IProviderProfile, CreateProviderProfileFormType, EditProviderProfileFormType>({
    collectionName: "providerprofiles",
    model: ProviderProfile,
    service: providerProfileService,
    entityName: "ProviderProfile",
    defaultSort: {createdAt: -1},
    createSchema: createProviderProfileFormSchema,
    editSchema: editProviderProfileFormSchema,
    toDTO: (doc) => providerProfileToDTO(doc),
    toDTOArray: providerProfilesToDTOArray,
    toSelect: providerProfilesToSelect,
    listSchema: providerProfileFormSchema,
    /** Account page narrows to one user; the company list shows every profile. */
    extraListFilter: ({userId}) => (userId ? {user: new ObjectId(userId)} : {}),
    /** One live profile per user; the user is the caller unless the form names another. */
    buildCreateData: async (params) => {
        const {actionUserCtx, company, session, logger, languageCode} = params;
        const user = new ObjectId(params.userId ?? actionUserCtx.userId);
        if (!user.equals(actionUserCtx.userId)
            && !(await userService.findOne({_id: user, companies: company._id}, {session, logger, languageCode}, null, "_id"))) {
            throw apiValidationException("cant_access_this_user", "user", null, languageCode);
        }
        if (await providerProfileService.findOne({user, company: company._id}, {session, logger, languageCode}, null, "_id")) {
            throw apiValidationException("provider_profile_already_exists", null, null, languageCode);
        }
        return {...buildCreate(params), user};
    },
    buildUpdateData: buildUpdate,
    enrichSingle: async (doc, params) => {
        const metrics = await loadProviderProfileMetrics(doc.user._id, params.company._id, params);
        return providerProfileToDTO(doc, metrics);
    },
    enrichUpdate: async (doc, params) => {
        const metrics = await loadProviderProfileMetrics(doc.user._id, params.company._id, params);
        return providerProfileToDTO(doc, metrics);
    },
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: ProviderProfile,
        service: providerProfileService,
        entityName: "ProviderProfile",
        keys: ["user"],
        errorCode: "provider_profile_already_exists",
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
    // Stripe Connect onboarding: POST /api/eCommerceMarketplace/providerProfile/{createAccountLink|refreshAccountStatus}
    actions: ProviderProfileActions,
});
