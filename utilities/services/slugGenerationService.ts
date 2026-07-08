import {ObjectId} from "mongodb";

function toBaseSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function generateUniqueSlug(
    base: string,
    model: {countDocuments(filter: object): Promise<number>} & any,
    companyId: ObjectId,
    existingId?: ObjectId,
): Promise<string> {
    const baseSlug = toBaseSlug(base) || "product";
    let slug = baseSlug;
    let suffix = 0;

    while (true) {
        const filter: Record<string, unknown> = {slug, company: companyId};
        if (existingId) filter._id = {$ne: existingId};
        const count = await model.countDocuments(filter);
        if (count === 0) return slug;
        suffix++;
        slug = `${baseSlug}-${suffix}`;
    }
}
