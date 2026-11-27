/**
 * Builds the platform product category data (D195) from a release of Shopify's Standard Product Taxonomy (MIT,
 * https://github.com/Shopify/product-taxonomy): levels 1–4 of every vertical except "Mature" and "Uncategorized",
 * with names in the five languages. English, German, French and Italian come from the release; Albanian comes from
 * `productTaxonomy.sq.json` (English name → Albanian), kept in this repo. Swiss German writes "ss" for "ß".
 *
 * Every row keeps Shopify's id, so building from a later release updates the same rows: new ids are new categories,
 * a renamed category keeps its id, and an id that is gone is hidden at seed time while products still use it.
 *
 * Usage (from maestro/), with the release's `categories.{en,de,fr,it}.txt` unpacked in <dir>:
 *   npx ts-node --transpile-only modules/eCommerce/scripts/build-product-taxonomy.ts <dir> v2026-11
 */
import fs from "fs";
import path from "path";

const LANGUAGES = ["en", "de", "fr", "it"] as const;
const MAX_DEPTH = 4;
const LEFT_OUT = new Set(["Mature", "Uncategorized"]);
const OUT_DIR = path.resolve(__dirname, "../database/seeds/taxonomy");

type Language = (typeof LANGUAGES)[number];
export type TaxonomyCategory = {
    /** Shopify's id (`aa-1-2`); the parent's id is this one without its last part. */
    id: string;
    parent: string | null;
    order: number;
    slug: string;
    name: {en: string; sq: string; de: string; fr: string; it: string};
};

function readRelease(dir: string, language: Language): Map<string, string[]> {
    const rows = new Map<string, string[]>();
    for (const line of fs.readFileSync(path.join(dir, `categories.${language}.txt`), "utf8").split("\n")) {
        if (!line.trim() || line.startsWith("#")) continue;
        const [gid, pathText] = line.split(" : ");
        rows.set(gid.trim().split("/").pop() ?? "", pathText.trim().split(" > "));
    }
    return rows;
}

const slugify = (text: string): string =>
    text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function main(): void {
    const [dir, release] = process.argv.slice(2);
    if (!dir || !release) throw new Error("Usage: build-product-taxonomy.ts <dir with categories.{en,de,fr,it}.txt> <release, e.g. v2026-11>");

    const byLanguage = Object.fromEntries(LANGUAGES.map((language) => [language, readRelease(dir, language)])) as Record<Language, Map<string, string[]>>;
    const albanian: Record<string, string> = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "productTaxonomy.sq.json"), "utf8"));

    const included = [...byLanguage.en.entries()]
        .filter(([, names]) => names.length <= MAX_DEPTH && !LEFT_OUT.has(names[0]))
        .sort(([a], [b]) => a.localeCompare(b, "en", {numeric: true}));

    const missingAlbanian = new Set<string>();
    const usedSlugs = new Set<string>();
    const categories: TaxonomyCategory[] = included.map(([id, names]) => {
        const en = names[names.length - 1];
        const parts = id.split("-");
        const parent = parts.length > 1 ? parts.slice(0, -1).join("-") : null;
        // The shortest readable slug that is still free: the name, then with its parent's name, then with the id.
        const candidates = [slugify(en), slugify(`${names[names.length - 2] ?? ""} ${en}`), `${slugify(en)}-${id}`];
        const slug = candidates.find((candidate) => candidate && !usedSlugs.has(candidate)) ?? `${slugify(en)}-${id}`;
        usedSlugs.add(slug);
        const sq = albanian[en];
        if (!sq) missingAlbanian.add(en);
        const last = (language: Language): string => {
            const localized = byLanguage[language].get(id);
            if (!localized) throw new Error(`Category ${id} has no ${language} name in the release.`);
            return localized[localized.length - 1];
        };
        return {
            id,
            parent,
            order: Number(parts[parts.length - 1]) || 0,
            slug,
            name: {en, sq: sq ?? en, de: last("de").replace(/ß/g, "ss"), fr: last("fr"), it: last("it")},
        };
    });

    const ids = new Set(categories.map((category) => category.id));
    const orphans = categories.filter((category) => category.parent && !ids.has(category.parent));
    if (orphans.length > 0) throw new Error(`Categories without their parent: ${orphans.slice(0, 5).map((c) => c.id).join(", ")}`);
    if (missingAlbanian.size > 0) {
        throw new Error(`${missingAlbanian.size} names have no Albanian translation in productTaxonomy.sq.json, e.g. ${[...missingAlbanian].slice(0, 5).join(", ")}`);
    }

    const data = {
        source: {
            name: "Shopify Standard Product Taxonomy",
            url: "https://github.com/Shopify/product-taxonomy",
            release,
            license: "MIT (see SHOPIFY-TAXONOMY-LICENSE.txt)",
            levels: MAX_DEPTH,
            leftOut: [...LEFT_OUT],
        },
        categories,
    };
    fs.writeFileSync(path.join(OUT_DIR, "productTaxonomy.json"), JSON.stringify(data) + "\n");
    process.stdout.write(`Wrote ${categories.length} categories from release ${release} (${[...new Set(categories.map((c) => c.id.split("-")[0]))].length} verticals).\n`);
}

main();
