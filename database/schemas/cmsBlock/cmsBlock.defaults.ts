import dayjs from "dayjs";
import CmsBlock, {type CmsBlockType} from "./cmsBlock";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";

export type CmsBlockSeed = {
    title: string;
    type: CmsBlockType;
    position: number;
    config: Record<string, unknown>;
};

export const defaultCmsBlockSeeds: readonly CmsBlockSeed[] = [
    {
        title: "Summer Drop Hero",
        type: "hero_banner",
        position: 1,
        config: {headline: "Summer studio essentials", cta: "Shop featured", collectionSlug: "featured"},
    },
    {
        title: "Free shipping bar",
        type: "announcement_bar",
        position: 0,
        config: {text: "Free shipping on orders over €60 — use FREESHIP"},
    },
    {
        title: "Featured collection strip",
        type: "featured_collection",
        position: 2,
        config: {collectionSlug: "featured", limit: 4},
    },
    {
        title: "Flash sale teaser",
        type: "flash_sale",
        position: 3,
        config: {collectionSlug: "sale", endsAt: dayjs().add(5, "day").toISOString()},
    },
];

/**
 * Seeds storefront CMS blocks. Idempotent on `{company, title}`.
 */
export async function createCmsBlocks(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createCmsBlocks", parentLogger);
    logger.start("Creating CMS blocks...");

    let count = 0;
    for (const seed of defaultCmsBlockSeeds) {
        try {
            const payload = {
                type: seed.type,
                title: seed.title,
                isActive: true,
                position: seed.position,
                config: seed.config,
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
