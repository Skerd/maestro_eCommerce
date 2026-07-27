import {objectIdToString} from "@coreModule/utilities/mappers/common.mapper";

export type NamedRef = {_id: string; name: string};

type LeanFindModel = { find: (filter: any) => {select: (fields: string) => {lean: () => Promise<any[]>}}; };

/** Normalize ObjectId | populated doc | string into ObjectIds for `$in` queries. */
export function asObjectIds(ids: unknown[] | undefined): any[] {
    if (!ids?.length) return [];
    return ids
        .map((id: any) => {
            if (!id) return null;
            if (typeof id === "object" && id._id) return id._id;
            return id;
        })
        .filter(Boolean);
}

/** Load `_id` + display name stubs for chip/label UIs, preserving input order. */
export async function loadNamedRefs(
    model: LeanFindModel,
    ids: unknown[] | undefined,
    nameField: "name" | "title",
): Promise<NamedRef[]> {
    const objectIds = asObjectIds(ids);
    if (!objectIds.length) return [];

    const docs = await model.find({_id: {$in: objectIds}}).select(`_id ${nameField}`).lean();
    const byId = new Map(docs.map((d: any) => [d._id.toString(), d]));

    return objectIds.map((oid) => {
        const id = objectIdToString(oid);
        const doc = byId.get(id);
        if (!doc) return {_id: id, name: id};
        const name = nameField === "title" ? (doc.title ?? "") : (doc.name ?? "");
        return {_id: id, name: String(name || id)};
    });
}