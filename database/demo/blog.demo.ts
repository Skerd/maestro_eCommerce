/**
 * Shop blog demo: categories + posts for the storefront `/blog` pages and the
 * home page's latest-posts strip. Core owns the blog schemas and writers; this
 * file owns the copy and the Unsplash covers (via the marketplace demo media helper).
 */

import type {ObjectId} from "mongodb";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {
    createBlogCategories,
    type BlogCategorySeed,
} from "@coreModule/database/schemas/blogCategory/blogCategory.defaults";
import {createBlogPosts, type BlogPostSeed} from "@coreModule/database/schemas/blogPost/blogPost.defaults";
import {resolveDemoImagesFromUnsplash} from "@coreModule/database/demo/demoMedia";

const BLOG_CATEGORY_SEEDS: readonly BlogCategorySeed[] = [
    {
        name: "Store News",
        slug: "store-news",
        description: "New drops, seasonal edits, and what is happening in the shop.",
    },
    {
        name: "Style Guides",
        slug: "style-guides",
        description: "How to wear, pair, and look after the pieces you buy from us.",
    },
    {
        name: "Marketplace Tips",
        slug: "marketplace-tips",
        description: "Getting the most out of the services marketplace, as a buyer or a provider.",
    },
];

type ShopBlogPostSeed = Omit<BlogPostSeed, "mainImage" | "imageGallery" | "createdBy"> & {
    /** Unsplash photo ids: the first is the cover, the rest the article gallery. */
    photoIds: readonly string[];
};

const BLOG_POST_SEEDS: readonly ShopBlogPostSeed[] = [
    {
        slug: "the-summer-edit",
        title: "The summer edit is here",
        categorySlug: "store-news",
        publishedDaysAgo: 3,
        photoIds: ["1441986300917-64674bd600d8", "1515372039744-b8f02a3ae446"],
        excerpt: "Lighter layers, new cuts, and a handful of studio essentials. Here is what just landed and why we picked it.",
        content: [
            "Every season we pull together a short list of pieces we would actually wear ourselves. This summer that list leans light: breathable fabrics, relaxed cuts, and colours that work as well in the city as they do on holiday.",
            "The new dresses and blouses are cut from cotton and linen blends that keep their shape after a long day. The trousers are wide in the leg and high in the waist, so they pair with almost everything else in the edit.",
            "We have also added a small run of accessories: a crossbody bag that fits a phone, keys and a paperback, and a few pairs of everyday earrings that do not need taking off.",
            "Orders over €60 ship free with the code FREESHIP, and if something is not right you can request a return from your account.",
        ].join("\n\n"),
    },
    {
        slug: "capsule-wardrobe-in-ten-pieces",
        title: "How to build a capsule wardrobe in ten pieces",
        categorySlug: "style-guides",
        publishedDaysAgo: 9,
        photoIds: ["1483985988355-763728e1935b", "1469334031218-e382a71b716b", "1515372039744-b8f02a3ae446"],
        excerpt: "Fewer pieces, more outfits. A practical way to pick ten items that all work together.",
        content: [
            "A capsule wardrobe is not about owning as little as possible. It is about owning pieces that combine easily, so getting dressed takes a minute instead of twenty.",
            "Start with a colour base. Pick two neutrals you like wearing, for example navy and cream, and one accent colour. Everything you choose should sit comfortably next to at least two of them.",
            "Then cover the basics: two tops you can wear alone, one knit for layering, one pair of tailored trousers, one pair of relaxed trousers or jeans, one dress, and one outer layer such as a trench.",
            "Finish with three pieces that add character: a scarf, a bag you reach for every day, and one pair of shoes that are comfortable enough to walk in all afternoon.",
            "Before buying anything new, try it against what you already own. If you cannot picture three outfits with it, it probably does not belong in the capsule.",
        ].join("\n\n"),
    },
    {
        slug: "caring-for-knitwear",
        title: "Caring for knitwear: wash less, store smarter",
        categorySlug: "style-guides",
        publishedDaysAgo: 16,
        photoIds: ["1515372039744-b8f02a3ae446"],
        excerpt: "Most knitwear is ruined by washing, not wearing. A few habits that keep cardigans and jumpers looking new.",
        content: [
            "The most common question our support team gets about knitwear is why a cardigan has lost its shape. Nearly always, the answer is the washing machine.",
            "Wash knits less often. Airing a jumper overnight removes most odours, and spot-cleaning handles small marks. When it does need a wash, use cold water, a wool detergent, and a gentle or hand-wash cycle.",
            "Never hang wet knitwear. Press the water out in a towel, then dry it flat, reshaping it while it is damp. Hanging stretches the shoulders and the hem.",
            "Store knits folded, not on hangers, and keep them somewhere dry. A cedar block in the drawer helps keep moths away.",
            "If something you bought from us has pilled or stretched within the first few weeks, get in touch. That is not normal wear, and we will sort it out.",
        ].join("\n\n"),
    },
    {
        slug: "hiring-a-freelancer-checklist",
        title: "Hiring a freelancer on the marketplace: a buyer's checklist",
        categorySlug: "marketplace-tips",
        publishedDaysAgo: 6,
        photoIds: ["1600880292203-757bb62b4baf", "1552664730-d307ca884978"],
        excerpt: "From picking a listing to approving the final delivery: what to check at each step so the job comes back the way you pictured it.",
        content: [
            "The services marketplace lets you buy work from independent providers, from logo design to website builds and voice-overs. A little preparation goes a long way.",
            "Read the whole listing, not just the price. Check which package fits your job, what each one includes, and how many revisions and delivery days come with it. Add-ons such as faster delivery are listed separately.",
            "Look at the provider's profile and reviews. Reviews are only left by buyers who completed an order, so they are a good guide to how the provider communicates and delivers.",
            "If no listing fits, post a task request instead. Describe the job, your budget and your deadline, and providers will send you bids you can compare side by side.",
            "When the delivery arrives, review it carefully. You can accept it or ask for a revision with clear notes on what should change. Specific feedback gets better results than \"make it pop\".",
        ].join("\n\n"),
    },
    {
        slug: "how-escrow-and-milestones-work",
        title: "How escrow and milestones protect both sides of an order",
        categorySlug: "marketplace-tips",
        publishedDaysAgo: 12,
        photoIds: ["1460925895917-afdab827c52f", "1551288049-bebda4e38f71"],
        excerpt: "Your payment is held until the work is delivered. Here is how that works, and what milestones add on larger jobs.",
        content: [
            "When you place a marketplace order, you pay up front, but the money does not go straight to the provider. It is held in escrow while the work is in progress.",
            "That protects you as the buyer: the provider is only paid once you are happy with the delivery. It protects the provider too, because they know the funds are already there before they start.",
            "Larger jobs can be split into milestones, for example design, build, and launch. Each milestone has its own amount, and you release it when that stage is done, so neither side carries the risk of the whole job at once.",
            "If something goes wrong and you cannot agree with the provider, you can open a dispute on the order. Our team reviews the order history, the deliveries and the messages, and decides how the held funds are settled.",
        ].join("\n\n"),
    },
    {
        slug: "becoming-a-provider",
        title: "Becoming a provider: setting up a profile that gets hired",
        categorySlug: "marketplace-tips",
        photoIds: ["1498050108023-c5249f4df085"],
        excerpt: "A strong profile, clear packages, and fast replies. What makes buyers pick one provider over another.",
        content: [
            "Buyers decide in seconds, so your profile and your first listing do most of the work for you.",
            "Use a real photo and a short headline that says what you do and for whom. List your skills and the languages you work in.",
            "Offer three packages at different price points, and be precise about what each includes. Add-ons are a good way to cover extras like source files or rush delivery without cluttering the packages.",
            "Reply to task requests quickly and tailor every bid. A bid that repeats the buyer's brief back to them and explains your approach beats a generic one every time.",
        ].join("\n\n"),
    },
];

/** Every post is authored by the company's main user (echo@echo.com), like the rest of the demo data. */
export async function seedShopBlogDemoData(parentLogger: serverLogger, company: ICompany): Promise<void> {
    const logger = getLogger("eCommerce_blog_demo_seed", parentLogger);
    logger.start("Seeding shop blog demo data...");

    const categories = await createBlogCategories(logger, company, BLOG_CATEGORY_SEEDS);
    const createdBy = company.createdBy as unknown as ObjectId;

    const posts: BlogPostSeed[] = [];
    for (const {photoIds, ...seed} of BLOG_POST_SEEDS) {
        const images = await resolveDemoImagesFromUnsplash(photoIds, seed.slug, seed.title, company, createdBy, logger, "blogPost");
        posts.push({...seed, createdBy, mainImage: images.mainImageId, imageGallery: images.galleryIds.slice(1)});
    }
    await createBlogPosts(logger, company, posts, categories);

    logger.finish("Finished seeding shop blog demo data!");
}
