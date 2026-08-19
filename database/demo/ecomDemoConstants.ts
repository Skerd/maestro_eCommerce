import dayjs from "dayjs";
import type {Types} from "mongoose";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";

/** Marker carried on demo rows (`tags`, `internalNotes`, `sessionId`, `idempotencyKey`, …). */
export const ECOM_DEMO_TAG = "ecom-demo-seed";

/** Cart + checkout both have TTL indexes on `expiresAt` (`expireAfterSeconds: 0`). */
export function ecomDemoExpiresFar(): Date {
    return dayjs().add(10, "year").toDate();
}

export type EcomDemoAddr = typeof defaultCompaniesValues.address;

export type EcomDemoGeo = {
    countryId?: Types.ObjectId;
    stateId?: Types.ObjectId;
    cityId?: Types.ObjectId;
};

export function buildAlmirShippingAddress(addr: EcomDemoAddr, countryId?: Types.ObjectId) {
    return {
        firstName: "Almir",
        lastName: "Leka",
        phone: "+355 69 000 0000",
        street: addr.street,
        city: addr.cityName,
        state: addr.stateCode,
        postalCode: addr.postalCode,
        ...(countryId ? {country: countryId} : {}),
    };
}
