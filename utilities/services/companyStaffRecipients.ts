import {ObjectId} from "mongodb";
import Role from "@coreModule/database/schemas/role/role";
import User from "@coreModule/database/schemas/user/user";

/**
 * Active company admins (isAdmin roles) — used for merchant order / stock alerts.
 */
export async function findCompanyAdminReceiverIds(companyId: ObjectId | string): Promise<string[]> {
    const cid = typeof companyId === "string" ? new ObjectId(companyId) : companyId;
    const adminRoles = await Role.find({company: cid, isAdmin: true}).select("_id").lean();
    if (!adminRoles.length) {
        return [];
    }
    const roleIds = adminRoles.map(r => r._id);
    const users = await User.find({
        companies: cid,
        isActive: true,
        roles: {
            $elemMatch: {
                company: cid,
                active: "active",
                roles: {$in: roleIds},
            },
        },
    })
        .select("_id")
        .lean();
    return users.map(u => u._id.toString());
}

export async function findCompanyAdminEmailRecipients(
    companyId: ObjectId | string,
): Promise<Array<{userId: string; email: string; fullName: string}>> {
    const cid = typeof companyId === "string" ? new ObjectId(companyId) : companyId;
    const adminRoles = await Role.find({company: cid, isAdmin: true}).select("_id").lean();
    if (!adminRoles.length) {
        return [];
    }
    const roleIds = adminRoles.map(r => r._id);
    const users = await User.find({
        companies: cid,
        isActive: true,
        roles: {
            $elemMatch: {
                company: cid,
                active: "active",
                roles: {$in: roleIds},
            },
        },
    })
        .select("_id username name surname fullName")
        .lean();

    return users
        .filter(u => !!(u as any).username)
        .map(u => ({
            userId: u._id.toString(),
            email: (u as any).username as string,
            fullName: (u as any).fullName || `${(u as any).name ?? ""} ${(u as any).surname ?? ""}`.trim() || (u as any).username,
        }));
}
