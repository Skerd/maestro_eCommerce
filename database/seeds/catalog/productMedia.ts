/**
 * Seeds product `Media` documents from Unsplash photo ids into GridFS.
 * Main + gallery images per catalog product, resolved from name-matched image kits.
 */
import {createHash} from "crypto";
import fs from "fs";
import path from "path";
import {ObjectId} from "mongodb";
import sharp from "sharp";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import Media from "@coreModule/database/schemas/media/media";
import {createGridFSStorage} from "@coreModule/utilities/gridfs/gridfsStorage";
import {catalogProductSeeds} from "@eCommerceModule/database/schemas/product/product.catalog.seeds";
import {resolveProductPhotoIds} from "@eCommerceModule/database/schemas/product/product.catalog.media";

const CACHE_DIR = path.resolve(__dirname, "media");

/**
 * Stable Media `_id` keyed by seed + slot + photo so a kit change replaces
 * the wrong hero instead of reusing a stale GridFS blob.
 */
export function mediaIdForProductSeed(seedKey: string, galleryIndex: number, photoId: string): ObjectId {
    const material = `ecom-product-media:v2:${seedKey}:g${galleryIndex}:${photoId}`;
    const hex = createHash("sha256").update(material).digest("hex").slice(0, 24);
    return new ObjectId(hex);
}

function unsplashUrl(photoId: string): string {
    return `https://images.unsplash.com/photo-${photoId}?w=800&h=800&fit=crop&auto=format&q=80`;
}

async function loadOrFetchImage(
    photoId: string,
    title: string,
    logger: ReturnType<typeof getLogger>,
): Promise<{buffer: Buffer; width: number; height: number} | undefined> {
    if (!fs.existsSync(CACHE_DIR)) {
        await fs.promises.mkdir(CACHE_DIR, {recursive: true});
    }
    // Cache by photo id — same Unsplash asset is shared across products in a kit.
    const cachePath = path.join(CACHE_DIR, `${photoId}.jpg`);

    if (fs.existsSync(cachePath)) {
        const buffer = await fs.promises.readFile(cachePath);
        const meta = await sharp(buffer).metadata();
        return {buffer, width: meta.width ?? 800, height: meta.height ?? 800};
    }

    try {
        const response = await fetch(unsplashUrl(photoId), {
            headers: {Accept: "image/*", "User-Agent": "ArpeggioEcommerceDemoSeed/1.0"},
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const raw = Buffer.from(await response.arrayBuffer());
        const buffer = await sharp(raw).resize(800, 800, {fit: "cover"}).jpeg({quality: 82}).toBuffer();
        await fs.promises.writeFile(cachePath, buffer);
        return {buffer, width: 800, height: 800};
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn(`Unsplash fetch failed for ${photoId}: ${message}; using placeholder.`);
        try {
            const label = title.slice(0, 28);
            const svg = `
<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#4a5568"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <text x="400" y="400" fill="#edf2f7" font-family="Helvetica,Arial,sans-serif"
        font-size="36" text-anchor="middle" dominant-baseline="middle">${label.replace(/[<>&]/g, "")}</text>
</svg>`;
            const buffer = await sharp(Buffer.from(svg)).jpeg({quality: 80}).toBuffer();
            await fs.promises.writeFile(cachePath, buffer);
            return {buffer, width: 800, height: 800};
        } catch {
            return undefined;
        }
    }
}

export type ProductMediaBundle = {
    mainImage: ObjectId;
    gallery: ObjectId[];
};

export type CreateProductMediaResult = {
    bySeedKey: Record<string, ProductMediaBundle>;
};

/**
 * Ensures main + gallery Media docs per catalog product. Idempotent on Media `_id`.
 */
export async function createProductMedia(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<CreateProductMediaResult> {
    const logger = getLogger("mongoDbInitialization-createProductMedia", parentLogger);
    const expectedAssets = catalogProductSeeds.reduce(
        (n, seed) => n + resolveProductPhotoIds(seed).length,
        0,
    );
    logger.start(`Creating eCommerce product media (~${expectedAssets} assets)...`);

    const bySeedKey: Record<string, ProductMediaBundle> = {};
    const gridfs = createGridFSStorage("en-US", "media", logger);
    let created = 0;
    let reused = 0;
    let skipped = 0;

    for (const seed of catalogProductSeeds) {
        try {
            const photoIds = resolveProductPhotoIds(seed);
            const galleryIds: ObjectId[] = [];

            for (let i = 0; i < photoIds.length; i++) {
                const photoId = photoIds[i]!;
                const mediaId = mediaIdForProductSeed(seed.seedKey, i, photoId);
                const existing = await Media.findById(mediaId).select("_id");
                if (existing) {
                    galleryIds.push(mediaId);
                    reused += 1;
                    continue;
                }

                const image = await loadOrFetchImage(photoId, seed.title, logger);
                if (!image) {
                    skipped += 1;
                    continue;
                }

                const fileName = `${seed.slug}-g${i}.jpg`;
                const fileId = await gridfs.uploadFile(image.buffer, fileName, {
                    company: String(company._id),
                    source: "ecommerce-catalog-seed",
                    mediaId: mediaId.toHexString(),
                    photoId,
                });

                await Media.create({
                    _id: mediaId,
                    type: "image",
                    originalName: fileName,
                    fileName,
                    fileId,
                    mimeType: "image/jpeg",
                    extension: "jpg",
                    fileSize: image.buffer.length,
                    sizeInBytes: image.buffer.length,
                    metadata: {
                        size: image.buffer.length,
                        extension: "jpg",
                        mime: "image/jpeg",
                        safeCheckedFlag: true,
                        scannedAt: new Date(),
                        scannerResult: "Seeded asset — scan skipped",
                        resolution: {width: image.width, height: image.height},
                    },
                    resolution: {width: image.width, height: image.height},
                    company: company._id,
                    createdBy: company.createdBy,
                    uploadedAt: new Date(),
                });

                galleryIds.push(mediaId);
                created += 1;
            }

            if (galleryIds.length === 0) {
                skipped += 1;
                continue;
            }

            bySeedKey[seed.seedKey] = {
                mainImage: galleryIds[0]!,
                gallery: galleryIds,
            };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.err(`Error creating product media for '${seed.seedKey}': ${message}`);
            skipped += 1;
        }
    }

    logger.finish(
        `Finished creating eCommerce product media! (${created} new, ${reused} existing, ${skipped} skipped)`,
    );
    return {bySeedKey};
}
