import dayjs from "dayjs";
import CmsBlock, {type CmsBlockType, type ICmsBlockConfig} from "./cmsBlock";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {CreateCollectionsResult} from "@eCommerceModule/database/schemas/collection/collection.defaults";

export type CmsBlockSeed = {
    title: string;
    type: CmsBlockType;
    position: number;
    config: ICmsBlockConfig & {collectionSlug?: string};
};

export const defaultCmsBlockSeeds: readonly CmsBlockSeed[] = [
    {
        title: demoName("Summer Drop Hero"),
        type: "hero_banner",
        position: 1,
        config: {
            headline: "Summer studio essentials",
            subheadline: "New cuts, lighter layers, and studio kit for the season.",
            ctaLabel: "Shop featured",
            ctaHref: "/products",
        },
    },
    {
        title: demoName("Free shipping bar"),
        type: "announcement_bar",
        position: 0,
        config: {message: "Free shipping on orders over €60 — use FREESHIP", linkHref: "/products"},
    },
    {
        title: demoName("Featured collection strip"),
        type: "featured_collection",
        position: 2,
        config: {headline: "Featured", collectionSlug: "featured", limit: 4},
    },
    {
        title: demoName("Flash sale teaser"),
        type: "flash_sale",
        position: 3,
        config: {headline: "Flash sale", collectionSlug: "sale", limit: 4},
    },
];

/**
 * Seeds storefront CMS blocks. Idempotent on `{company, title}`.
 */
export async function createCmsBlocks(
    parentLogger: serverLogger,
    company: ICompany,
    collections: CreateCollectionsResult,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createCmsBlocks", parentLogger);
    logger.start("Creating CMS blocks...");

    let count = 0;
    for (const seed of defaultCmsBlockSeeds) {
        try {
            const {collectionSlug, ...restConfig} = seed.config;
            const config: ICmsBlockConfig = {...restConfig};
            if (collectionSlug) {
                const collection = collections.bySlug[collectionSlug];
                if (!collection) {
                    logger.warn(`Skipping CMS block "${seed.title}": collection "${collectionSlug}" was not seeded.`);
                    continue;
                }
                config.collectionId = collection._id;
            }

            const payload = {
                type: seed.type,
                title: seed.title,
                isActive: true,
                position: seed.position,
                config,
                startsAt: dayjs().subtract(2, "day").toDate(),
                endsAt: dayjs().add(30, "day").toDate(),
                visibility: {devices: ["desktop", "mobile", "tablet"] as ("desktop" | "mobile" | "tablet")[], regions: []},
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await CmsBlock.findOne({company: company._id, title: seed.title});
            if (!doc) {
                await CmsBlock.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            count += 1;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating CMS block '${seed.title}': ${message}`);
        }
    }

    logger.finish("Finished creating CMS blocks!", count);
    return count;
}
