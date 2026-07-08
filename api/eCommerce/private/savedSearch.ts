import { Router } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
import { transactionHandler } from "@coreModule/utilities/middlewares/transactionHandler";
import { TransactionRequiredParams } from "@coreModule/utilities/middlewares/transactionUtils";
import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
import { schemaSanitizer, SchemaSanitizerMWType } from "@coreModule/utilities/middlewares/schemaSanitizerMW";
import { dslFilterMW, DslFilterMWType } from "@coreModule/utilities/middlewares/dslFilterMW";
import { savedSearchService } from "@eCommerceModule/database/schemas/savedSearch/savedSearch.service";
import {
    SavedSearchFormResponseType,
    SavedSearch as SavedSearchData,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.form.response.type";
import { SavedSearchFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.form.type";
import { savedSearchFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.form.validator";
import { createSavedSearchFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/createSavedSearch.form.validator";
import { CreateSavedSearchFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/createSavedSearch.form.type";
import { deleteSavedSearchFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/deleteSavedSearch.form.validator";
import { DeleteSavedSearchFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/deleteSavedSearch.form.type";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import SavedSearchModel from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import { savedSearchToDTO, savedSearchesToDTO } from "@eCommerceModule/utilities/mappers/savedSearchMapper.dto";
import { apiValidationException } from "armonia/src/modules/core/helpers/exceptions";
import { SingleForm, TableForm } from "armonia/src/modules/core/types/shared.types";
import { validateSingleForm } from "armonia/src/modules/core/utilities/zod/shared.validator";

const router = Router();

router.post(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(savedSearchFormSchema),
    schemaSanitizer({ model: "savedsearches", requiredModes: ["read"] }),
    dslFilterMW({ model: "savedsearches" }),
    asyncHandler(getSavedSearches)
);

type GetSavedSearchesType = AuthenticatedMWType & SchemaSanitizerMWType & TableForm & DslFilterMWType & SavedSearchFormType;

async function getSavedSearches(params: GetSavedSearchesType): Promise<SavedSearchFormResponseType> {
    const { logger, languageCode, actionUserCtx, company, id, limit, offset, sanitizedReadFields, dslFilterQuery } = params;

    const filter: any = { company: company._id, user: actionUserCtx.userId };
    if (id) filter["_id"] = new ObjectId(id);

    if (dslFilterQuery && Object.keys(dslFilterQuery as object).length > 0) {
        filter.$and = [...((filter.$and as unknown[]) ?? []), dslFilterQuery];
    }

    const populate = SchemaGuard.generatePopulate(sanitizedReadFields, SavedSearchModel.schema);

    const [searches, total] = await Promise.all([
        savedSearchService.find(
            filter,
            { logger, languageCode },
            populate.populate,
            populate.select || "",
            { createdAt: -1 },
            limit,
            offset ?? 0
        ),
        savedSearchService.count(filter, { logger, languageCode }),
    ]);

    return { data: savedSearchesToDTO(searches), total };
}

router.post(
    "/single",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(validateSingleForm),
    schemaSanitizer({ model: "savedsearches", requiredModes: ["read"] }),
    asyncHandler(getSavedSearchSingle)
);

type GetSavedSearchSingleType = AuthenticatedMWType & SchemaSanitizerMWType & SingleForm;

async function getSavedSearchSingle(params: GetSavedSearchSingleType): Promise<SavedSearchData> {
    const { logger, languageCode, actionUserCtx, company, _id, sanitizedReadFields } = params;

    const populate = SchemaGuard.generatePopulate(sanitizedReadFields, SavedSearchModel.schema);

    const search = await savedSearchService.findOneOrThrow(
        { _id: new ObjectId(_id), company: company._id, user: actionUserCtx.userId },
        { logger, languageCode },
        populate.populate,
        populate.select || ""
    );

    return savedSearchToDTO(search);
}

router.put(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 20 }),
    transactionHandler(),
    validateFormZod(createSavedSearchFormSchema),
    asyncHandler(createSavedSearch)
);

async function createSavedSearch(
    params: TransactionRequiredParams & AuthenticatedMWType & CreateSavedSearchFormType
): Promise<SavedSearchData> {
    const { logger, languageCode, session, company, actionUserCtx, name, filters } = params;

    const data = {
        user: actionUserCtx.userId,
        company: company._id,
        name: name.trim(),
        filters: filters || {},
    };

    const saved = await savedSearchService.create(data as any, {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    return savedSearchToDTO(saved);
}

router.delete(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 20 }),
    validateFormZod(deleteSavedSearchFormSchema),
    transactionHandler(),
    asyncHandler(deleteSavedSearch)
);

async function deleteSavedSearch(
    params: TransactionRequiredParams & AuthenticatedMWType & DeleteSavedSearchFormType
): Promise<{ deleted: boolean }> {
    const { logger, languageCode, session, _id, company, actionUserCtx } = params;

    const search = await savedSearchService.findOne(
        { _id: new ObjectId(_id), company: company._id, user: actionUserCtx.userId },
        { session, logger, languageCode }
    );

    if (!search) {
        throw apiValidationException("saved_search_not_found", null, null, languageCode);
    }

    await savedSearchService.deleteById(new ObjectId(_id), {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    return { deleted: true };
}

export { router };
