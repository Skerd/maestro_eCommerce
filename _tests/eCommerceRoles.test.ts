import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import {describe, expect, it} from "vitest";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {eCommerceDefaultRoles} from "@eCommerceModule/database/schemas/role/eCommerce.role.defaults";
import {eCommerceRoleUserSeeds} from "@eCommerceModule/database/schemas/role/eCommerce.role.users";
import {actionPermissionTag} from "@coreModule/utilities/security/actionPermissions";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {PosOrderActions} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";

/** Permission groups the eCommerce models actually generate (capitalised tag prefix, as createRolePermissions names them). */
async function eCommercePermissionGroups(): Promise<Set<string>> {
    const schemasDir = path.resolve(__dirname, "../database/schemas");
    for (const name of fs.readdirSync(schemasDir)) {
        const modelFile = path.join(schemasDir, name, `${name}.ts`);
        if (fs.existsSync(modelFile)) await import(modelFile);
    }
    const groups = new Set<string>();
    for (const modelName of mongoose.modelNames()) {
        // As the API boot does for every model (some don't normalize themselves)
        normalizeSchemaPermissions(mongoose.model(modelName));
        mongoose.model(modelName).schema.eachPath((_path, schemaType) => {
            const tag: unknown = schemaType.options?.permissions?.self?.read;
            if (typeof tag === "string" && tag.includes("[")) {
                const prefix = tag.slice(0, tag.indexOf("["));
                groups.add(prefix.charAt(0).toUpperCase() + prefix.slice(1));
            }
        });
    }
    return groups;
}

describe("eCommerce default role pack", () => {
    it("has one demo user for every default role", () => {
        const slugs = eCommerceRoleUserSeeds.map((seed) => seed.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        expect(slugs.sort()).toEqual(eCommerceDefaultRoles.map((role) => role.slug).sort());
    });

    it("only names permission groups that exist", async () => {
        const groups = await eCommercePermissionGroups();
        for (const role of eCommerceDefaultRoles) {
            for (const group of [...(role.permissionGroups ?? []), ...(role.readPermissionGroups ?? [])]) {
                expect(groups.has(group), `${role.slug}: ${group}`).toBe(true);
            }
        }
    }, 60000);

    it("leaves the CIS resolution actions (D98) to the till's supervisors, not the Cashier (D99)", () => {
        const methods = ["recordFiscalCodes", "resendFiscal"] as const;
        for (const method of methods) expect(typeof PosOrderActions.prototype[method]).toBe("function");
        const tags = methods.map((method) => actionPermissionTag(PosOrder, method, "self"));
        expect(tags).toEqual(["posorders[action:recordFiscalCodes]", "posorders[action:resendFiscal]"]);

        const bySlug = new Map(eCommerceDefaultRoles.map((role) => [role.slug, role]));
        const cashier = bySlug.get("ecom_cashier")!;
        expect(cashier.permissionGroups).toContain("Posorders");
        expect(cashier.excludedPermissions).toEqual(tags);
        for (const slug of ["ecom_store_manager", "ecom_pos_supervisor"]) {
            const role = bySlug.get(slug)!;
            expect(role.permissionGroups, slug).toContain("Posorders");
            expect(role.excludedPermissions ?? [], slug).toEqual([]);
        }
    });

    // The till actions are gated by their own permissions (SEC-02): every role that owns the POS orders gets them, as it
    // had the POS field writes they used to check, and a read-only role gets neither.
    it("gives the till actions to every role that owns the POS orders, and to no read-only role", () => {
        const tillActions = ["hold", "pay", "refund", "reprint", "deleteHeld"] as const;
        for (const method of tillActions) expect(typeof PosOrderActions.prototype[method]).toBe("function");
        const tags = tillActions.map((method) => actionPermissionTag(PosOrder, method, "self"));

        const owners = eCommerceDefaultRoles.filter((role) => role.permissionGroups?.includes("Posorders")).map((role) => role.slug);
        expect(owners.sort()).toEqual(["ecom_cashier", "ecom_pos_supervisor", "ecom_store_manager"]);
        for (const role of eCommerceDefaultRoles) {
            for (const tag of tags) expect(role.excludedPermissions ?? [], role.slug).not.toContain(tag);
        }
        const analyst = eCommerceDefaultRoles.find((role) => role.slug === "ecom_analyst")!;
        expect(analyst.permissionGroups).not.toContain("Posorders");
        expect(analyst.readPermissionGroups).toContain("Posorders");
    });
});
