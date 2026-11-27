import type {ObjectId} from "mongodb";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";

/** How a shop's own category name was matched to a platform category (D195). */
export type PlatformCategoryMatch = {categoryId: ObjectId; name: string; how: "exact" | "close"};

const LANGUAGES = ["en", "sq", "de", "fr", "it"] as const;

/** Lower-cased and trimmed: an exact match ignores only case, spacing and bracketed tags such as a demo's "[DEMO]". */
const exactKey = (text: string): string => text.replace(/\[[^\]]*\]/g, " ").trim().replace(/\s+/g, " ").toLowerCase();

/** An English plural's singular, roughly: dresses → dress, accessories → accessory, shoes → shoe, glass stays. */
function singular(word: string): string {
    if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
    if (/(sses|shes|ches|xes|zes)$/.test(word)) return word.slice(0, -2);
    if (word.endsWith("ss") || word.length <= 3) return word;
    return word.endsWith("s") ? word.slice(0, -1) : word;
}

/** A close match also ignores accents, punctuation, "&" against "and", and a plural "s"/"es" on each word. */
function closeKey(text: string): string {
    return exactKey(text).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/).filter(Boolean)
        .map(singular)
        .join(" ");
}

/** A platform category a name can match: its names in every language, its depth in the tree and its order there. */
export type MatchCandidate<Id> = {id: Id; name: string; names: (string | undefined)[]; depth: number; order: number};

/** Shallower categories first ("Dresses" before a deeper "… > Dresses"), then the taxonomy's order. */
function better<Id>(a: MatchCandidate<Id>, b: MatchCandidate<Id>): MatchCandidate<Id> {
    if (a.depth !== b.depth) return a.depth < b.depth ? a : b;
    return a.order <= b.order ? a : b;
}

/**
 * Matches a shop's own category name to a platform category (D195): the same name in any of the five languages first,
 * then a close form of it. A name it cannot match returns null and is listed by the caller, never guessed.
 */
export function buildPlatformCategoryMatcher<Id>(candidates: MatchCandidate<Id>[]): (name: string) => {id: Id; name: string; how: "exact" | "close"} | null {
    const exact = new Map<string, MatchCandidate<Id>>();
    const close = new Map<string, MatchCandidate<Id>>();
    for (const candidate of candidates) {
        for (const text of [candidate.name, ...candidate.names]) {
            if (!text) continue;
            const e = exactKey(text);
            const knownExact = exact.get(e);
            exact.set(e, knownExact ? better(knownExact, candidate) : candidate);
            const c = closeKey(text);
            const knownClose = close.get(c);
            close.set(c, knownClose ? better(knownClose, candidate) : candidate);
        }
    }
    return (name: string) => {
        const hit = exact.get(exactKey(name));
        if (hit) return {id: hit.id, name: hit.name, how: "exact"};
        const near = close.get(closeKey(name));
        return near ? {id: near.id, name: near.name, how: "close"} : null;
    };
}

/** The matcher over the approved platform categories in the database (the Odoo import). Loads the tree once. */
export async function createPlatformCategoryMatcher(): Promise<(name: string) => PlatformCategoryMatch | null> {
    const rows = await categoryService.find({requestStatus: "approved"}, {withDeleted: false}, undefined, "_id name names shopifyId order");
    const match = buildPlatformCategoryMatcher<ObjectId>(rows.map((row) => ({
        id: row._id,
        name: row.name,
        names: LANGUAGES.map((language) => row.names?.[language]),
        depth: row.shopifyId ? row.shopifyId.split("-").length : 99,
        order: row.order,
    })));
    return (name: string) => {
        const found = match(name);
        return found ? {categoryId: found.id, name: found.name, how: found.how} : null;
    };
}
