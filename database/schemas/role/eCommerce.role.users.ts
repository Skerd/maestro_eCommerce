import {ObjectId} from "mongodb";
import User, {type IEmbeddedCompanyRole} from "@coreModule/database/schemas/user/user";
import Role from "@coreModule/database/schemas/role/role";
import {defaultRoleSlug} from "@coreModule/database/schemas/role/role.defaults";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import type {ICompany} from "@coreModule/database/schemas/company/company";
import {eCommerceDefaultRoles} from "./eCommerce.role.defaults";

/** Shared demo password. Hashed on save by the User pre-save hook. */
export const ECOMMERCE_ROLE_USER_PASSWORD = "ecommerce";

export type ECommerceRoleUserSeed = {
    slug: string;
    name: string;
    surname: string;
    username: string;
    phoneNumber: string;
    birthday: string;
};

export const eCommerceRoleUserSeeds: ECommerceRoleUserSeed[] = [
    {
        slug: "ecom_store_manager",
        name: "Alex",
        surname: "Morgan",
        username: "store.manager@ecommerce.demo",
        phoneNumber: "+355691110001",
        birthday: "1988-03-12",
    },
    {
        slug: "ecom_warehouse_operator",
        name: "Jordan",
        surname: "Blake",
        username: "warehouse.operator@ecommerce.demo",
        phoneNumber: "+355691110002",
        birthday: "1991-06-04",
    },
    {
        slug: "ecom_cashier",
        name: "Casey",
        surname: "Reed",
        username: "cashier@ecommerce.demo",
        phoneNumber: "+355691110003",
        birthday: "1994-09-18",
    },
    {
        slug: "ecom_catalog_editor",
        name: "Riley",
        surname: "Brooks",
        username: "catalog.editor@ecommerce.demo",
        phoneNumber: "+355691110004",
        birthday: "1990-01-27",
    },
    {
        slug: "ecom_pricing_officer",
        name: "Taylor",
        surname: "Quinn",
        username: "pricing.officer@ecommerce.demo",
        phoneNumber: "+355691110005",
        birthday: "1986-11-09",
    },
    {
        slug: "ecom_order_manager",
        name: "Morgan",
        surname: "Hale",
        username: "order.manager@ecommerce.demo",
        phoneNumber: "+355691110006",
        birthday: "1989-04-21",
    },
    {
        slug: "ecom_customer_support",
        name: "Jamie",
        surname: "Cole",
        username: "customer.support@ecommerce.demo",
        phoneNumber: "+355691110007",
        birthday: "1993-07-30",
    },
    {
        slug: "ecom_pos_supervisor",
        name: "Avery",
        surname: "Dunn",
        username: "pos.supervisor@ecommerce.demo",
        phoneNumber: "+355691110008",
        birthday: "1987-12-02",
    },
    {
        slug: "ecom_analyst",
        name: "Parker",
        surname: "Shaw",
        username: "store.analyst@ecommerce.demo",
        phoneNumber: "+355691110009",
        birthday: "1992-02-14",
    },
];

function refId(value: unknown): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (value instanceof ObjectId) {
        return value.toString();
    }
    if (typeof value === "object" && "_id" in value) {
        const inner = (value as {_id?: unknown})._id;
        if (inner != null && inner !== value) {
            return refId(inner);
        }
    }
    return String(value);
}

function companyMembership(user: {roles: IEmbeddedCompanyRole[]}, companyId: ObjectId): IEmbeddedCompanyRole | undefined {
    const companyKey = companyId.toString();
    return user.roles.find((entry) => refId(entry.company) === companyKey);
}

function membershipHasRole(membership: IEmbeddedCompanyRole, roleId: ObjectId): boolean {
    const roleKey = roleId.toString();
    return membership.roles.some((assigned) => refId(assigned) === roleKey);
}

/**
 * One panel user per eCommerce default role, assigned only that role.
 * Idempotent on username. Runs with company demo data, after default roles exist.
 */
export async function createECommerceRoleUsers(
    parentLogger: serverLogger | undefined,
    company: ICompany,
): Promise<void> {
    const logger = getLogger("eCommerce_role_users", parentLogger);
    logger.start(`Creating eCommerce role users for '${company.name}'...`);

    const profileBySlug = new Map(eCommerceRoleUserSeeds.map((seed) => [seed.slug, seed]));
    const creatorId = refId(company.createdBy);

    for (const role of eCommerceDefaultRoles) {
        const profile = profileBySlug.get(role.slug);
        if (!profile) {
            logger.err(`No demo user profile for role '${role.slug}'`);
            continue;
        }

        const slug = defaultRoleSlug(company.name, role);
        const dbRole = await Role.findOne({company: company._id, slug}).select("_id name");
        if (!dbRole) {
            logger.warn(`Role '${slug}' is not on this company; skipping ${profile.username}`);
            continue;
        }

        const existing = await User.findOne({username: profile.username});
        if (existing) {
            const membership = companyMembership(existing, company._id);
            if (membership && membershipHasRole(membership, dbRole._id)) {
                logger.info(`${profile.username} already has '${dbRole.name}'`);
                continue;
            }

            if (!existing.companies.some((entry) => refId(entry) === company._id.toString())) {
                existing.companies.push(company._id as never);
            }
            if (membership) {
                membership.roles.push(dbRole._id as unknown as IEmbeddedCompanyRole["roles"][number]);
                membership.rolesCount = membership.roles.length;
            } else {
                existing.roles.push(embeddedRole(company._id, dbRole._id));
            }
            existing.$locals = existing.$locals || {};
            existing.$locals.auditUserId = creatorId ? new ObjectId(creatorId) : existing._id;
            await existing.save();
            logger.info(`Assigned '${dbRole.name}' to existing user ${profile.username}`);
            continue;
        }

        const userId = new ObjectId();
        const created = new User({
            _id: userId,
            username: profile.username,
            password: ECOMMERCE_ROLE_USER_PASSWORD,
            name: profile.name,
            surname: profile.surname,
            fullName: `${profile.name} ${profile.surname}`,
            timezone: "Europe/Berlin",
            birthday: profile.birthday,
            phoneNumber: profile.phoneNumber,
            isEmailVerified: true,
            emailVerifiedAt: new Date("2024-01-15T09:00:00.000Z"),
            registeredFrom: creatorId ? new ObjectId(creatorId) : userId,
            mfaStatus: "notActive",
            online: false,
            isBot: false,
            companies: [company._id],
            roles: [embeddedRole(company._id, dbRole._id)],
        });
        created.$locals = created.$locals || {};
        created.$locals.auditUserId = creatorId ? new ObjectId(creatorId) : userId;
        await created.save();
        logger.info(`Created ${profile.username} (${profile.name} ${profile.surname}) as '${dbRole.name}'`);
    }

    logger.finish(`Finished eCommerce role users for '${company.name}'`);
}

function embeddedRole(companyId: ObjectId, roleId: ObjectId): IEmbeddedCompanyRole {
    return {
        _id: new ObjectId(),
        active: "active",
        unsuccessfulLogins: 0,
        lockedOutUntil: null,
        lastLogin: null,
        rolesCount: 1,
        roles: [roleId] as unknown as IEmbeddedCompanyRole["roles"],
        company: companyId as unknown as IEmbeddedCompanyRole["company"],
    };
}
