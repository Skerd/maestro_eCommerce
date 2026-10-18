/**
 * Turns the PNG files that ship next to a seeder (`<schema>/demoData/`) into real
 * GridFS blobs + `Media` documents, so seeded listings and task requests come up
 * with images instead of placeholder tiles.
 *
 * File naming convention inside a `demoData` directory:
 *   <seedKey>-main.png
 *   <seedKey>-gallery-1.png, <seedKey>-gallery-2.png, ...
 *
 * Idempotent: a `Media` document is reused when one already exists for the same
 * company and fileName, so re-running a seed never duplicates blobs.
 */

import fs from "fs";
import path from "path";
import {ObjectId} from "mongodb";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import Media from "@coreModule/database/schemas/media/media";
import {createGridFSStorage} from "@coreModule/utilities/gridfs/gridfsStorage";

export type ResolvedDemoImages = {
    mainImageId?: ObjectId;
    galleryIds: ObjectId[];
};

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
