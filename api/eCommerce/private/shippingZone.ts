import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ShippingZoneSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.schema-def";
import {createShippingZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/createShippingZone.form.validator";
import {editShippingZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/editShippingZone.form.validator";
import ShippingZone from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import {shippingZoneService} from "@eCommerceModule/database/schemas/shippingZone/shippingZone.service";
import {shippingZoneToDTO, shippingZonesToDTO, shippingZoneToSelect, shippingZonesToSelect} from "@eCommerceModule/utilities/mappers/shippingZoneMapper.dto";
import {calculateShipping} from "@eCommerceModule/utilities/services/shippingCalculationService";

const shippingZoneTransforms = {
    rates: (v: unknown) => v,
} as const;

const buildShippingZoneCreateFromSchemaDef = buildCreateDataFromSchemaDef(ShippingZoneSchemaDef, shippingZoneTransforms);
const buildShippingZoneUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(ShippingZoneSchemaDef, shippingZoneTransforms);

export const basePath = "/api/eCommerce/shippingZone";
export const {router} = createCrudRouter({
    collectionName: "shippingZones",
    model: ShippingZone,
    service: shippingZoneService,
    entityName: "ShippingZone",
    selectSearchField: "name",
    defaultSort: {name: 1},
    createSchema: createShippingZoneFormSchema,
    editSchema: editShippingZoneFormSchema,
    toDTO: shippingZoneToDTO,
    toDTOArray: shippingZonesToDTO,
    toSelect: shippingZonesToSelect,
    buildCreateData: async (params) => buildShippingZoneCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildShippingZoneUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/calculate",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {subtotal, totalWeight, itemCount, destinationCountry, destinationState, destinationPostalCode} = req.body;

        const rates = await calculateShipping(
            {
                subtotal: subtotal ?? 0,
                totalWeight,
                itemCount: itemCount ?? 0,
                destinationCountry,
                destinationState,
                destinationPostalCode,
            },
            company._id,
        );

        return res.json({data: rates});
    }),
);
