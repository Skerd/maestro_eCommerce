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
import {ShippingZoneActions} from "@eCommerceModule/database/schemas/shippingZone/shippingZone.actions";
import {shippingZoneToDTO, shippingZonesToDTO} from "@eCommerceModule/utilities/mappers/shippingZone/shippingZoneMapper.dto";
import {shippingZonesToSelect} from "@eCommerceModule/utilities/mappers/shippingZone/shippingZoneMapper.select";
import {calculateShipping} from "@eCommerceModule/utilities/services/shippingCalculationService";

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
    buildCreateData: buildCreateDataFromSchemaDef(ShippingZoneSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ShippingZoneSchemaDef),
    actions: ShippingZoneActions,
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
