/**
 * Shop blog demo: categories + posts for the storefront `/blog` pages and the
 * home page's latest-posts strip. Core owns the blog schemas and writers; this
 * file owns the copy and the Unsplash covers (via the core demo media helper).
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
        name: "Shopping Help",
        slug: "shopping-help",
        description: "Orders, delivery, returns and gift cards: how shopping with us works.",
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
        slug: "from-order-to-doorstep",
        title: "From order to doorstep: following your parcel",
        categorySlug: "shopping-help",
        publishedDaysAgo: 6,
        photoIds: ["1441986300917-64674bd600d8"],
        excerpt: "What happens after you press pay, and where to find your tracking number once the parcel is on its way.",
        content: [
            "As soon as your payment goes through, you get an order confirmation by email, and the order appears in your account with its number and status.",
            "We pick and pack most orders within a working day. When the parcel leaves the warehouse, the order is marked as shipped and you receive the carrier's tracking number.",
            "If your order holds items from different warehouses, it may arrive in more than one parcel. Each parcel has its own tracking number, listed on the order in your account.",
            "Need to change the delivery address? Get in touch before the order ships and we will update it for you.",
        ].join("\n\n"),
    },
    {
        slug: "returns-and-exchanges",
        title: "Returns and exchanges, step by step",
        categorySlug: "shopping-help",
        publishedDaysAgo: 12,
        photoIds: ["1483985988355-763728e1935b"],
        excerpt: "Wrong size or not quite right? How to send something back for a refund or swap it for another piece.",
        content: [
            "Open the order in your account and choose the items you want to send back. Tell us whether you want a refund or an exchange, and add a short note on why.",
            "We review every request and reply by email. Once it is approved, pack the items in their original packaging and send them back.",
            "When the parcel reaches us, we check the items and complete the request: a refund goes back to the way you paid, and an exchange ships out as a new parcel.",
            "You can follow each step from the order in your account, from pending to completed.",
        ].join("\n\n"),
    },
    {
        slug: "gift-cards",
        title: "Gift cards: how to give them and how to spend them",
        categorySlug: "shopping-help",
        photoIds: ["1469334031218-e382a71b716b"],
        excerpt: "A gift card lets someone choose for themselves. Here is how to use one at checkout and what happens to the balance.",
        content: [
            "A gift card is a code with a balance. Enter the code in your cart and the balance is taken off the order total.",
            "If the order costs less than the card's balance, the rest stays on the card for your next order. If it costs more, you pay the difference as usual.",
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
