import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {schemaSanitizer} from "@coreModule/utilities/middlewares/schemaSanitizerMW";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {EncryptString, DecryptString} from "@coreModule/utilities/security/encryption";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {SaveOdooConnectionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooConnection/odooConnection.schema-def";
import type {OdooConnection, OdooConnectionTestResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooConnection/odooConnection.dto";
import {saveOdooConnectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooConnection/saveOdooConnection.form.validator";
import OdooConnectionModel from "@eCommerceModule/database/schemas/odooConnection/odooConnection";
import {odooConnectionService} from "@eCommerceModule/database/schemas/odooConnection/odooConnection.service";
import {odooConnectionToDTO} from "@eCommerceModule/utilities/mappers/odooConnection/odooConnectionMapper.dto";
import {createOdooJsonRpcClient} from "@eCommerceModule/utilities/odoo/odooJsonRpc";
import {parseOdooBaseUrl} from "@eCommerceModule/utilities/odoo/odooUrl";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";

export const basePath = "/api/eCommerce/odooConnection";
export const router = Router();

const readLimiter = rateLimiter({windowMs: 60000, max: 60});
const writeLimiter = rateLimiter({windowMs: 60000, max: 20});

function crudOpts(params: AuthenticatedMWType): CrudOptions {
    return {logger: params.logger, languageCode: params.languageCode, auditUserId: params.actionUserCtx.userId};
}

async function loadConnection(params: AuthenticatedMWType) {
    return odooConnectionService.findOne({company: params.company._id}, crudOpts(params));
}

function plaintextKey(value: string | undefined): string {
    return value?.trim() ?? "";
}

router.get(
    "",
    authMW("private"),
    readLimiter,
    schemaSanitizer({model: "odooconnections", requiredModes: ["read"]}),
    asyncHandler(async (params: AuthenticatedMWType): Promise<{data: OdooConnection | null}> => {
        const doc = await loadConnection(params);
        return {data: doc ? odooConnectionToDTO(doc) : null};
    }),
);

router.put(
    "",
    authMW("private"),
    writeLimiter,
    validateFormZod(saveOdooConnectionFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & SaveOdooConnectionFormType): Promise<{data: OdooConnection}> => {
        const {languageCode, company, actionUserCtx} = params;
        SchemaGuard.checkModelPermission(OdooConnectionModel, "create", actionUserCtx, languageCode);
        parseOdooBaseUrl(params.url, languageCode);
        const opts = crudOpts(params);
        const existing = await loadConnection(params);
        const nextKey = plaintextKey(params.apiKeyEncrypted);
        const apiKeyEncrypted = nextKey
            ? EncryptString(nextKey)
            : existing?.apiKeyEncrypted;
        if (!apiKeyEncrypted) {
            throw apiValidationException("odoo_api_key_required", "apiKeyEncrypted", null, languageCode);
        }
        const fields = {
            url: params.url.trim(),
            database: params.database.trim(),
            username: params.username.trim(),
            apiKeyEncrypted,
        };
        const saved = existing
            ? await odooConnectionService.updateByIdOrThrow(existing._id, {$set: fields}, opts)
            : await odooConnectionService.create({...fields, company: company._id}, opts);
        return {data: odooConnectionToDTO(saved)};
    }),
);

router.post(
    "/test",
    authMW("private"),
    writeLimiter,
    validateFormZod(saveOdooConnectionFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & SaveOdooConnectionFormType): Promise<OdooConnectionTestResponse> => {
        const {languageCode, actionUserCtx} = params;
        SchemaGuard.checkModelPermission(OdooConnectionModel, "create", actionUserCtx, languageCode);
        parseOdooBaseUrl(params.url, languageCode);
        const typedKey = plaintextKey(params.apiKeyEncrypted);
        const stored = typedKey ? typedKey : (await loadConnection(params))?.apiKeyEncrypted;
        const apiKey = typedKey ? typedKey : stored ? DecryptString(stored) : "";
        if (!apiKey) {
            throw apiValidationException("odoo_api_key_required", "apiKeyEncrypted", null, languageCode);
        }
        const client = createOdooJsonRpcClient({
            url: params.url.trim(),
            database: params.database.trim(),
            username: params.username.trim(),
            apiKey,
            languageCode,
        });
        await client.authenticate();
        return {ok: true};
    }),
);
