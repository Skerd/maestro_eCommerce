import path from "path";
import dayjs from "dayjs";
import {ObjectId} from "mongodb";
import type {HydratedDocument} from "mongoose";
import TaskRequest, {type ITaskRequest, type TaskRequestStatus} from "./taskRequest";
import ListingCategory from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {demoSeedName} from "@eCommerceModule/database/demo/demoSeed";
import {resolveDemoImagesFromDir, resolveMediaObjectId, resolveMediaObjectIds} from "@eCommerceModule/database/demo/demoMedia";

const DEMO_DATA_DIR = path.resolve(__dirname, "demoData");

export type DemoTaskAddress = {
    street: string;
    postalCode: string;
    country: ObjectId;
    state?: ObjectId;
    city: ObjectId;
    latitude: number;
    longitude: number;
};

export type TaskRequestSeed = {
    seedKey: string;
    title: string;
    description: string;
    categorySlug: string;
    budgetMin: number;
    budgetMax: number;
    status: TaskRequestStatus;
    /** Days from now when the task expires. */
    expiresInDays: number;
};

export const defaultTaskRequestSeeds: readonly TaskRequestSeed[] = [
    {
        seedKey: "task-01-mobile-app",
        title: "Need a mobile app developer",
        description: "Looking for an experienced React Native developer for a fitness tracking app with wearables integration.",
        categorySlug: "dev-mobile",
        budgetMin: 2000,
        budgetMax: 5000,
        status: "open",
        expiresInDays: 30,
    },
    {
        seedKey: "task-02-social-graphics",
        title: "Social media graphics for coffee shop",
        description: "Need 10 Instagram post templates and 5 story templates for a new specialty coffee brand launch.",
        categorySlug: "design-logo-branding",
        budgetMin: 100,
        budgetMax: 200,
        status: "awarded",
        expiresInDays: 14,
    },
    {
        seedKey: "task-03-ecommerce-setup",
        title: "Shopify store setup and theme customization",
        description: "Set up a Shopify store with 50 products, payment gateways, and a custom theme aligned to our brand guide.",
        categorySlug: "dev-ecommerce",
        budgetMin: 800,
        budgetMax: 1500,
        status: "open",
        expiresInDays: 21,
    },
    {
        seedKey: "task-04-seo-audit",
        title: "SEO audit for SaaS landing pages",
        description: "Technical and on-page SEO audit for 8 marketing landing pages with prioritized fix list.",
        categorySlug: "marketing-seo",
        budgetMin: 150,
        budgetMax: 350,
        status: "open",
        expiresInDays: 10,
    },
    {
        seedKey: "task-05-product-video",
        title: "Product launch video (60 seconds)",
        description: "Script, shoot, and edit a 60-second product video for a smart home device crowdfunding campaign.",
        categorySlug: "video-production",
        budgetMin: 600,
        budgetMax: 1200,
        status: "closed",
        expiresInDays: -5,
    },
    {
        seedKey: "task-06-podcast-editing",
        title: "Weekly podcast editing (4 episodes)",
        description: "Edit four 45-minute podcast episodes per month: noise reduction, intro/outro, and show notes summary.",
        categorySlug: "audio-podcast",
        budgetMin: 200,
        budgetMax: 400,
        status: "open",
        expiresInDays: 45,
    },
    {
        seedKey: "task-07-business-plan",
        title: "Investor-ready business plan",
        description: "Write a 25-page business plan with financial projections for a B2B marketplace startup.",
        categorySlug: "biz-plans",
        budgetMin: 400,
        budgetMax: 900,
        status: "awarded",
        expiresInDays: 20,
    },
    {
        seedKey: "task-08-wordpress-migration",
        title: "WordPress to headless CMS migration",
        description: "Migrate 120 blog posts and media library from WordPress to a headless stack with redirects.",
        categorySlug: "dev-website",
        budgetMin: 500,
        budgetMax: 1100,
        status: "open",
        expiresInDays: 28,
    },
    {
        seedKey: "task-09-brand-identity",
        title: "Full brand identity package",
        description: "Logo, color palette, typography, and brand guidelines for a sustainable fashion label.",
        categorySlug: "design-logo-branding",
        budgetMin: 300,
        budgetMax: 700,
        status: "open",
        expiresInDays: 18,
    },
    {
        seedKey: "task-10-data-dashboard",
        title: "Sales analytics dashboard in Looker Studio",
        description: "Connect Shopify and Google Analytics data into an executive dashboard with weekly KPI views.",
        categorySlug: "data-analysis",
        budgetMin: 250,
        budgetMax: 600,
        status: "closed",
        expiresInDays: -2,
    },
];

export type CreateTaskRequestsResult = {
    taskRequests: HydratedDocument<ITaskRequest>[];
    bySeedKey: Record<string, HydratedDocument<ITaskRequest>>;
};

export async function createTaskRequests(
    parentLogger: serverLogger,
    company: ICompany,
    requester: IUser,
    currency: ICurrency,
    address: DemoTaskAddress,
): Promise<CreateTaskRequestsResult> {
    const logger = getLogger("mongoDbInitialization-createTaskRequests", parentLogger);
    logger.start("Creating task requests...");

    const taskRequests: HydratedDocument<ITaskRequest>[] = [];
    const bySeedKey: Record<string, HydratedDocument<ITaskRequest>> = {};

    try {
        for (const seed of defaultTaskRequestSeeds) {
            const category = await ListingCategory.findOne({
                slug: seed.categorySlug,
                company: company._id,
            }).select("_id");

            if (!category) {
                logger.warn(`Skipping task "${seed.title}": category "${seed.categorySlug}" not found`);
                continue;
            }

            let existing = await TaskRequest.findOne({
                company: company._id,
                name: demoSeedName(seed.seedKey),
            });

            let mainImageId = resolveMediaObjectId(existing?.mainImage);
            let galleryIds = resolveMediaObjectIds(existing?.imageGallery);

            if (!existing || !mainImageId) {
                const resolved = await resolveDemoImagesFromDir(
                    DEMO_DATA_DIR,
                    seed.seedKey,
                    company,
                    requester._id,
                    logger,
                    "taskRequest",
                );
                mainImageId = resolved.mainImageId;
                galleryIds = resolved.galleryIds;
            }

            const payload = {
                name: demoSeedName(seed.seedKey),
                title: seed.title,
                description: seed.description,
                category: category._id,
                requester: requester._id,
                budgetMin: seed.budgetMin,
                budgetMax: seed.budgetMax,
                currency: currency._id,
                status: seed.status,
                address,
                expiresAt: dayjs().add(seed.expiresInDays, "day").toDate(),
                mainImage: mainImageId,
                imageGallery: galleryIds,
                company: company._id,
                createdBy: requester._id,
            };

            if (!existing) {
                existing = await TaskRequest.create(payload);
                logger.debug(`Successfully created task request '${seed.title}' (${seed.seedKey})`);
            } else {
                existing.set(payload);
                await existing.save();
                logger.debug(`Task request '${seed.title}' (${seed.seedKey}) already exists; updated fields`);
            }

            taskRequests.push(existing);
            bySeedKey[seed.seedKey] = existing;
        }

        logger.finish("Finished creating task requests!", defaultTaskRequestSeeds.length);
        return {taskRequests, bySeedKey};
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating task requests: ${message}`);
        logger.fail("Failed to create task requests!");
        return {taskRequests: [], bySeedKey: {}};
    }
}
