import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {createCategories} from "@eCommerceModule/database/schemas/category/category.defaults";
import {createECommerceRoleUsers} from "@eCommerceModule/database/schemas/role/eCommerce.role.users";
import {seedECommerceDemoData} from "@eCommerceModule/database/demo/eCommerceCompanyDemo";

/** After property management (20); before marketplace (40). Seeds shared categories + catalog. */
export const companyDemoSeedOrder = 30;

export async function seedCompanyDemoData(parentLogger: serverLogger | undefined, company: any): Promise<void> {
    const logger = getLogger("eCommerce_company_demo_seed", parentLogger);
    await createECommerceRoleUsers(logger, company);
    await createCategories(logger, company);
    await seedECommerceDemoData(logger, company);
}
