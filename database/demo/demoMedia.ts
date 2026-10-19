/**
 * Resolves marketplace demo images into GridFS + `Media` documents.
 *
 * Preferred path (products-style): Unsplash photo kits from
 * `marketplace.demo.media.ts` — fetched once, cached under `demo/media/`, then
 * uploaded with stable Media `_id`s so re-seeds replace stale placeholder tiles.
 *
 * Legacy fallback: PNG/JPG files next to a seeder (`<schema>/demoData/`) named
 *   <seedKey>-main.*
 *   <seedKey>-gallery-1.*, <seedKey>-gallery-2.*, ...
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

export type ResolvedDemoImages = {
    mainImageId?: ObjectId;
    galleryIds: ObjectId[];
};

const CACHE_DIR = path.resolve(__dirname, "media");

const MIME_BY_EXTENSION: Record<string, {mime: string; type: string}> = {
    ".png": {mime: "image/png", type: "image"},
    ".jpg": {mime: "image/jpeg", type: "image"},
    ".jpeg": {mime: "image/jpeg", type: "image"},
    ".webp": {mime: "image/webp", type: "image"},
    ".pdf": {mime: "application/pdf", type: "pdf"},
};

/**
 * Normalises whatever a populated-or-not Mongoose ref hands back into an ObjectId.
 * Seeders call this on documents they just re-read, where `mainImage` may be a raw
 * id, a populated `Media` doc, or undefined.
 */
export function resolveMediaObjectId(value: unknown): ObjectId | undefined {
    if (!value) {
        return undefined;
    }
    if (value instanceof ObjectId) {
        return value;
    }
    const candidate = (value as {_id?: unknown})._id ?? value;
    if (candidate instanceof ObjectId) {
        return candidate;
    }
    if (typeof candidate === "string" && ObjectId.isValid(candidate)) {
        return new ObjectId(candidate);
    }
    if (candidate && typeof (candidate as {toString?: () => string}).toString === "function") {
        const asString = String(candidate);
        if (ObjectId.isValid(asString)) {
            return new ObjectId(asString);
        }
    }
    return undefined;
}

/** Array flavour of {@link resolveMediaObjectId}; drops anything unresolvable. */
export function resolveMediaObjectIds(value: unknown): ObjectId[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => resolveMediaObjectId(entry))
        .filter((entry): entry is ObjectId => Boolean(entry));
}

/**
 * Stable Media `_id` keyed by entity + seed + slot + photo so a kit change
 * replaces the wrong hero instead of reusing a stale GridFS blob.
 */
export function mediaIdForMarketplaceSeed(
    entityKind: string,
    seedKey: string,
    galleryIndex: number,
    photoId: string,
): ObjectId {
    const material = `ecom-marketplace-media:v1:${entityKind}:${seedKey}:g${galleryIndex}:${photoId}`;
    const hex = createHash("sha256").update(material).digest("hex").slice(0, 24);
    return new ObjectId(hex);
}

function unsplashUrl(photoId: string): string {
    return `https://images.unsplash.com/photo-${photoId}?w=800&h=800&fit=crop&auto=format&q=80`;
}

async function loadOrFetchUnsplashImage(
    photoId: string,
    title: string,
    logger: ReturnType<typeof getLogger>,
): Promise<{buffer: Buffer; width: number; height: number} | undefined> {
    if (!fs.existsSync(CACHE_DIR)) {
        await fs.promises.mkdir(CACHE_DIR, {recursive: true});
    }
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

/**
 * Uploads one local file and returns the id of its `Media` document, reusing an
 * existing document when the same fileName was already seeded for this company.
 */
async function ensureMediaForFile(
    filePath: string,
    company: ICompany,
    createdBy: ObjectId,
    logger: serverLogger,
    tag: string,
): Promise<ObjectId | undefined> {
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName).toLowerCase();
    const descriptor = MIME_BY_EXTENSION[extension];

    if (!descriptor) {
        logger.warn(`Demo media: unsupported extension "${extension}" for ${fileName}; skipping.`);
        return undefined;
    }

    const existing = await Media.findOne({company: company._id, fileName}).select("_id");
    if (existing) {
        return existing._id as ObjectId;
    }

    const buffer = await fs.promises.readFile(filePath);
    const gridfs = createGridFSStorage("en-US", "media", logger);
    const fileId = await gridfs.uploadFile(buffer, fileName, {
        company: String(company._id),
        source: "demo-seed",
        tag,
    });

    const media = await Media.create({
        type: descriptor.type,
        originalName: fileName,
        fileName,
        fileId,
        mimeType: descriptor.mime,
        extension: extension.replace(".", ""),
        fileSize: buffer.length,
        sizeInBytes: buffer.length,
        metadata: {
            size: buffer.length,
            extension: extension.replace(".", ""),
            mime: descriptor.mime,
            safeCheckedFlag: true,
            scannedAt: new Date(),
            scannerResult: "Seeded asset — scan skipped",
        },
        company: company._id,
        createdBy,
        uploadedAt: new Date(),
    });

    return media._id as ObjectId;
}

/**
 * Resolves Unsplash photo kits into main + gallery Media ids (products-style).
 * Idempotent on Media `_id`. Missing kits return an empty gallery.
 */
export async function resolveDemoImagesFromUnsplash(
    photoIds: readonly string[],
    seedKey: string,
    title: string,
    company: ICompany,
    createdBy: ObjectId,
    parentLogger: serverLogger,
    entityKind: string,
): Promise<ResolvedDemoImages> {
    const logger = getLogger(`demoMedia-${entityKind}`, parentLogger);

    if (photoIds.length === 0) {
        logger.debug(`No Unsplash kit for ${seedKey}`);
        return {galleryIds: []};
    }

    const gridfs = createGridFSStorage("en-US", "media", logger);
    const galleryIds: ObjectId[] = [];

    try {
        for (let i = 0; i < photoIds.length; i++) {
            const photoId = photoIds[i]!;
            const mediaId = mediaIdForMarketplaceSeed(entityKind, seedKey, i, photoId);
            const existing = await Media.findById(mediaId).select("_id");
            if (existing) {
                galleryIds.push(mediaId);
                continue;
            }

            const image = await loadOrFetchUnsplashImage(photoId, title, logger);
            if (!image) {
                continue;
            }

            const fileName = `${seedKey}-g${i}.jpg`;
            const fileId = await gridfs.uploadFile(image.buffer, fileName, {
                company: String(company._id),
                source: "marketplace-demo-seed",
                mediaId: mediaId.toHexString(),
                photoId,
                tag: `${entityKind}:${seedKey}`,
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
                createdBy,
                uploadedAt: new Date(),
            });

            galleryIds.push(mediaId);
        }
    } catch (e: unknown) {
        logger.err(`Failed resolving Unsplash demo media for ${seedKey}: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
        mainImageId: galleryIds[0],
        galleryIds,
    };
}

/**
 * Resolves `<seedKey>-main.*` and `<seedKey>-gallery-*.*` inside `directory`.
 * Missing files are not an error — a seed simply comes up without that image.
 */
export async function resolveDemoImagesFromDir(
    directory: string,
    seedKey: string,
    company: ICompany,
    createdBy: ObjectId,
    parentLogger: serverLogger,
    entityKind: string,
): Promise<ResolvedDemoImages> {
    const logger = getLogger(`demoMedia-${entityKind}`, parentLogger);

    if (!fs.existsSync(directory)) {
        logger.warn(`Demo media directory not found: ${directory}`);
        return {galleryIds: []};
    }

    let entries: string[];
    try {
        entries = await fs.promises.readdir(directory);
    } catch (e: unknown) {
        logger.warn(`Could not read demo media directory ${directory}: ${e instanceof Error ? e.message : String(e)}`);
        return {galleryIds: []};
    }

    const mainFile = entries.find((entry) => entry.startsWith(`${seedKey}-main.`));
    const galleryFiles = entries
        .filter((entry) => entry.startsWith(`${seedKey}-gallery-`))
        .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

    const tag = `${entityKind}:${seedKey}`;
    let mainImageId: ObjectId | undefined;
    const galleryIds: ObjectId[] = [];

    try {
        if (mainFile) {
            mainImageId = await ensureMediaForFile(path.join(directory, mainFile), company, createdBy, logger, tag);
        } else {
            logger.debug(`No main image for ${seedKey} in ${directory}`);
        }

        for (const galleryFile of galleryFiles) {
            const id = await ensureMediaForFile(path.join(directory, galleryFile), company, createdBy, logger, tag);
            if (id) {
                galleryIds.push(id);
            }
        }
    } catch (e: unknown) {
        logger.err(`Failed resolving demo media for ${seedKey}: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {mainImageId, galleryIds};
}
