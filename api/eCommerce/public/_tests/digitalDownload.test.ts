import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import {ObjectId} from "mongodb";
import {Readable} from "stream";
import request from "supertest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import {appFor} from "@coreModule/_tests/httpHarness";
import {getGridFSStorage} from "@coreModule/utilities/gridfs/gridfsStorage";
import Media from "@coreModule/database/schemas/media/media";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import * as digitalDownloadRoute from "@eCommerceModule/api/eCommerce/public/digitalDownload";

const app = appFor([{...digitalDownloadRoute, module: "eCommerce"}]);
const company = new ObjectId();
const TOKEN = "a-secret-download-token";

async function storedFile(status: string): Promise<ObjectId> {
    const bytes = Buffer.from("%PDF-1.4 the e-book");
    const fileId = await getGridFSStorage("en-US", "media").uploadFile(Readable.from(bytes), "ebook.pdf", {mimeType: "application/pdf"});
    const {insertedId} = await Media.collection.insertOne({
        type: "pdf", originalName: "ebook.pdf", fileName: "ebook.pdf", fileId: new ObjectId(fileId.toString()),
        mimeType: "application/pdf", extension: ".pdf", fileSize: bytes.length, isPublic: false, company, deletedAt: null,
        metadata: {size: bytes.length, extension: ".pdf", mime: "application/pdf", safeCheckedFlag: false, moderation: {status}},
    });
    return insertedId;
}

async function delivery(mediaId: ObjectId): Promise<ObjectId> {
    const {insertedId} = await DigitalDelivery.collection.insertOne({
        order: new ObjectId(), product: new ObjectId(), customer: new ObjectId(), token: TOKEN, media: [mediaId],
        downloadLimit: 3, downloadCount: 0, company, deletedAt: null,
    });
    return insertedId;
}

const download = (mediaId: ObjectId) => request(app).get(`/api/eCommerce/digitalDownload/${TOKEN}/${mediaId}`);
const downloadsUsed = async (id: ObjectId) => (await DigitalDelivery.collection.findOne({_id: id}))?.downloadCount;

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(async () => {
    await Media.collection.deleteMany({});
    await DigitalDelivery.collection.deleteMany({});
});

describe("a buyer's download of a file the content check holds (D177)", () => {
    it("waits for the platform's approval and gives the download back", async () => {
        for (const status of ["flagged", "rejected"]) {
            await DigitalDelivery.collection.deleteMany({});
            const file = await storedFile(status);
            const entitlement = await delivery(file);
            const res = await download(file);
            expect(res.body.error_code).toBe("download_held_for_review");
            expect(await downloadsUsed(entitlement)).toBe(0);
        }
    });

    it("sends an approved file and counts the download", async () => {
        const file = await storedFile("approved");
        const entitlement = await delivery(file);
        const res = await download(file);
        expect(res.status).toBe(200);
        expect(await downloadsUsed(entitlement)).toBe(1);
    });
});
