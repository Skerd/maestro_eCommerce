import {ObjectId} from "mongodb";
import {roleService} from "@coreModule/database/schemas/role/role.service";
import {userService} from "@coreModule/database/schemas/user/user.service";

/**
 * Active company admins (isAdmin roles) — used for merchant order / stock alerts.
 */
export async function findCompanyAdminReceiverIds(companyId: ObjectId | string): Promise<string[]> {
    const cid = typeof companyId === "string" ? new ObjectId(companyId) : companyId;
    const adminRoles = await roleService.find({company: cid, isAdmin: true}, {}, undefined, "_id");
    if (!adminRoles.length) {
        return [];
    }
    const roleIds = adminRoles.map(r => r._id);
    const users = await userService.find({
        companies: cid,
        isActive: true,
        roles: {
            $elemMatch: {
                company: cid,
                active: "active",
                roles: {$in: roleIds},
            },
        },
    }, {}, undefined, "_id");
    return users.map(u => u._id.toString());
}

export async function findCompanyAdminEmailRecipients(
    companyId: ObjectId | string,
): Promise<Array<{userId: string; email: string; fullName: string}>> {
    const cid = typeof companyId === "string" ? new ObjectId(companyId) : companyId;
    const adminRoles = await roleService.find({company: cid, isAdmin: true}, {}, undefined, "_id");
    if (!adminRoles.length) {
        return [];
    }
    const roleIds = adminRoles.map(r => r._id);
    const users = await userService.find({
        companies: cid,
        isActive: true,
        roles: {
            $elemMatch: {
                company: cid,
                active: "active",
                roles: {$in: roleIds},
            },
        },
    }, {}, undefined, "_id username name surname fullName");

    return users
        .filter(u => !!(u as any).username)
        .map(u => ({
            userId: u._id.toString(),
            email: (u as any).username as string,
            fullName: (u as any).fullName || `${(u as any).name ?? ""} ${(u as any).surname ?? ""}`.trim() || (u as any).username,
        }));
}
