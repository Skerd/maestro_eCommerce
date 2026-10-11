import type {HydratedDocument} from "mongoose";
import ProductAttribute, {type IProductAttribute} from "./productAttribute";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";

export type ProductAttributeSeed = {
    seedKey: string;
    name: string;
    values: string[];
    position: number;
    isUsedForVariants: boolean;
};

export const defaultProductAttributeSeeds: readonly ProductAttributeSeed[] = [
    {seedKey: "attr-size", name: demoName("Size"), values: ["S", "M", "L", "XL"], position: 1, isUsedForVariants: true},
    {seedKey: "attr-color", name: demoName("Color"), values: ["Black", "White", "Navy"], position: 2, isUsedForVariants: true},
    {seedKey: "attr-material", name: demoName("Material"), values: ["Cotton", "Fleece", "Leather"], position: 3, isUsedForVariants: false},
];

export type CreateProductAttributesResult = {
    bySeedKey: Record<string, HydratedDocument<IProductAttribute>>;
    byName: Record<string, HydratedDocument<IProductAttribute>>;
};

/**
 * Seeds Size / Color / Material. Idempotent on `{company, name}`.
 */
export async function createProductAttributes(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<CreateProductAttributesResult> {
    const logger = getLogger("mongoDbInitialization-createProductAttributes", parentLogger);
    logger.start("Creating product attributes...");

    const bySeedKey: Record<string, HydratedDocument<IProductAttribute>> = {};
    const byName: Record<string, HydratedDocument<IProductAttribute>> = {};

    for (const seed of defaultProductAttributeSeeds) {
        try {
            const payload = {
                name: seed.name,
                values: seed.values,
                isVisibleOnProductPage: true,
                isUsedForVariants: seed.isUsedForVariants,
                position: seed.position,
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await ProductAttribute.findOne({company: company._id, name: seed.name});
            if (!doc) {
                doc = await ProductAttribute.create(payload);
                logger.debug(`Created product attribute '${seed.name}'`);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySeedKey[seed.seedKey] = doc;
            byName[seed.name] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating product attribute '${seed.seedKey}': ${message}`);
        }
    }

    logger.finish("Finished creating product attributes!", Object.keys(bySeedKey).length);
    return {bySeedKey, byName};
}
