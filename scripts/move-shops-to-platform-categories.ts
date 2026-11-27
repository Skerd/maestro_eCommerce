/**
 * Moves every shop from its own product categories to the platform's (D195, roadmap P26.6). Without `--apply` it only
 * prints what would match: each shop's categories with the platform category they match (exact or close) or none.
 * With `--apply` it writes a journal of every old category and reference to `--journal=<dir>` (default: the current
 * folder), then moves (see `moveShopsToPlatformCategories`). Run it once per database.
 *
 * Usage (from maestro/, with the database's environment, e.g. `npm run dev -- run all ...` from the workspace root):
 *   npx ts-node --transpile-only -r tsconfig-paths/register modules/eCommerce/scripts/move-shops-to-platform-categories.ts [--apply] [--journal=<dir>]
 */
process.env.ENABLED_MODULES = process.env.ENABLED_MODULES || "eCommerce";

import mongoose from "mongoose";
import {connectToMongoDb} from "@coreModule/connections/connectToMongoDb";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {getLogger} from "@coreModule/loggers/serverLog";
import {moveShopsToPlatformCategories} from "@eCommerceModule/database/seeds/taxonomy/moveShopsToPlatformCategories";

async function main() {
    const logger = getLogger("move_shops_to_platform_categories");
    const apply = process.argv.includes("--apply");
    const journalDir = process.argv.find((arg) => arg.startsWith("--journal="))?.slice("--journal=".length) ?? process.cwd();
    logger.start(`${apply ? "Moving" : "Dry run:"} shops to the platform categories in ${process.env.MONGODB_DB_NAME}...`);
    await connectToMongoDb(logger, false);

    const report = await moveShopsToPlatformCategories({apply, journalDir, logger});
    const lines: string[] = [];
    for (const company of report.companies) {
        lines.push(`\n${company.company} (${company.categories.length} categories)`);
        for (const line of company.categories) {
            const target = line.match ? `${line.match.how === "exact" ? "=" : "≈"} ${line.match.name}` : "— no match, kept as a collection only";
            lines.push(`  ${line.name} [${line.products} products] ${target}`);
        }
    }
    lines.push(`\nTotal ${report.totals.categories}: ${report.totals.exact} exact, ${report.totals.close} close, ${report.totals.unmatched} unmatched.`);
    lines.push(report.applied ? `Applied. Journal: ${report.journal}` : "Dry run only: nothing changed. Add --apply to move.");
    process.stdout.write(`${lines.join("\n")}\n`);
    logger.finish("Done.");
    await mongoose.disconnect();
    process.exit(0);
}

// Operator scripts span companies on purpose (D16).
asCrossTenant("moving every shop to the platform product categories", main).catch(async (err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    try {
        await mongoose.disconnect();
    } catch {
        /* ignore */
    }
    process.exit(1);
});
