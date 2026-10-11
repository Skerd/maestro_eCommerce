import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Warehouse, {type IWarehouse} from "./warehouse";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import {demoName} from "@coreModule/utilities/helpers";

export const TIRANA_WAREHOUSE_SEED_KEY = "wh-tirana-main";
export const DURRES_WAREHOUSE_SEED_KEY = "wh-durres-overflow";

export type WarehouseSeed = {
    seedKey: string;
    name: string;
    code: string;
    isDefault: boolean;
    street: string;
    postalCode: string;
};

export type CreateWarehousesResult = {
    bySeedKey: Record<string, HydratedDocument<IWarehouse>>;
    primaryWarehouseId?: Types.ObjectId;
};

/**
 * Seeds the two demo warehouses. Idempotent on `{company, code}`.
 */
export async function createWarehouses(
    parentLogger: serverLogger,
    company: ICompany,
    geo: {countryId?: Types.ObjectId; stateId?: Types.ObjectId; cityId?: Types.ObjectId},
    addr: typeof defaultCompaniesValues.address,
): Promise<CreateWarehousesResult> {
    const logger = getLogger("mongoDbInitialization-createWarehouses", parentLogger);
    logger.start("Creating warehouses...");

    const tiranaLat = addr.geoLocation?.latitude ?? 41.32426719964653;
    const tiranaLng = addr.geoLocation?.longitude ?? 19.80706909189647;

    const seeds: readonly (WarehouseSeed & {latitude: number; longitude: number})[] = [
        {
            seedKey: TIRANA_WAREHOUSE_SEED_KEY,
            name: demoName("Tirana Main Warehouse"),
            code: "TIA-MAIN",
            isDefault: true,
            street: addr.street,
            postalCode: addr.postalCode,
            latitude: tiranaLat,
            longitude: tiranaLng,
        },
        {
            seedKey: DURRES_WAREHOUSE_SEED_KEY,
            name: demoName("Durrës Overflow"),
            code: "DUR-OVF",
            isDefault: false,
            street: "Rruga Taulantia",
            postalCode: "2001",
            latitude: 41.3231,
            longitude: 19.4414,
        },
    ];

    const bySeedKey: Record<string, HydratedDocument<IWarehouse>> = {};

    for (const seed of seeds) {
        try {
            const payload = {
                name: seed.name,
                code: seed.code,
                isDefault: seed.isDefault,
                isActive: true,
                address: {
                    ...(geo.countryId ? {country: geo.countryId} : {}),
                    ...(geo.stateId ? {state: geo.stateId} : {}),
                    ...(geo.cityId ? {city: geo.cityId} : {}),
                    street: seed.street,
                    postalCode: seed.postalCode,
                    latitude: seed.latitude,
                    longitude: seed.longitude,
                },
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await Warehouse.findOne({company: company._id, code: seed.code});
            if (!doc) {
                doc = await Warehouse.create(payload);
                logger.debug(`Created warehouse ${seed.code} (ecom-demo-seed)`);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySeedKey[seed.seedKey] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating warehouse '${seed.seedKey}': ${message}`);
        }
    }

    logger.finish("Finished creating warehouses!", Object.keys(bySeedKey).length);
    return {
        bySeedKey,
        primaryWarehouseId: bySeedKey[TIRANA_WAREHOUSE_SEED_KEY]?._id,
    };
}
