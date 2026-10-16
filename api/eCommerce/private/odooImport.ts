import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {schemaSanitizer} from "@coreModule/utilities/middlewares/schemaSanitizerMW";
import {odooImportFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.validator";
import type {OdooImportFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.type";
import type {OdooImportResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.response.type";
import {runOdooImport} from "@eCommerceModule/utilities/odoo/odooImportRunner";

export const basePath = "/api/eCommerce/odooImport";
export const router = Router();

router.post(
    "",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 5}),
    validateFormZod(odooImportFormSchema),
    schemaSanitizer({model: "odooconnections", requiredModes: ["read"]}),
    asyncHandler(async (params: AuthenticatedMWType & OdooImportFormType): Promise<OdooImportResponse> => {
        params.logger.start("Importing from Odoo...");
        const result = await runOdooImport(params);
        params.logger.finish("Finished Odoo import");
        return result;
    }),
);
