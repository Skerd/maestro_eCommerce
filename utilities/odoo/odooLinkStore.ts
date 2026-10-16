import {ObjectId} from "mongodb";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {odooLinkService} from "@eCommerceModule/database/schemas/odooLink/odooLink.service";
import type {IOdooLink} from "@eCommerceModule/database/schemas/odooLink/odooLink";

export async function findOdooLink(
    companyId: ObjectId,
    odooModel: string,
    odooId: number,
    opts: CrudOptions,
): Promise<IOdooLink | null> {
    return odooLinkService.findOne({company: companyId, odooModel, odooId}, opts);
}

const LINK_IN_CHUNK = 500;

export async function findOdooLinks(
    companyId: ObjectId,
    odooModel: string,
    odooIds: number[],
    opts: CrudOptions,
): Promise<IOdooLink[]> {
    if (odooIds.length === 0) return [];
    if (odooIds.length <= LINK_IN_CHUNK) {
        return odooLinkService.find({company: companyId, odooModel, odooId: {$in: odooIds}}, opts);
    }
    const found: IOdooLink[] = [];
    for (let offset = 0; offset < odooIds.length; offset += LINK_IN_CHUNK) {
        const slice = odooIds.slice(offset, offset + LINK_IN_CHUNK);
        found.push(...await odooLinkService.find({company: companyId, odooModel, odooId: {$in: slice}}, opts));
    }
    return found;
}

export async function rememberOdooLink(
    companyId: ObjectId,
    odooModel: string,
    odooId: number,
    localModel: string,
    localId: ObjectId,
    opts: CrudOptions,
): Promise<"created" | "updated"> {
    const existing = await findOdooLink(companyId, odooModel, odooId, opts);
    if (existing) {
        if (existing.localId.toString() !== localId.toString() || existing.localModel !== localModel) {
            await odooLinkService.updateByIdOrThrow(
                existing._id,
                {$set: {localModel, localId}},
                opts,
            );
        }
        return "updated";
    }
    await odooLinkService.create(
        {odooModel, odooId, localModel, localId, company: companyId},
        opts,
    );
    return "created";
}

export async function rememberOdooLinks(
    companyId: ObjectId,
    rows: {odooModel: string; odooId: number; localModel: string; localId: ObjectId}[],
    opts: CrudOptions,
): Promise<void> {
    if (rows.length === 0) return;
    await odooLinkService.createMany(
        rows.map((row) => ({...row, company: companyId})),
        opts,
    );
}
