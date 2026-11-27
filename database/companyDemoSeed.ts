import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {createECommerceRoleUsers} from "@eCommerceModule/database/schemas/role/eCommerce.role.users";
import {seedECommerceDemoData} from "@eCommerceModule/database/demo/eCommerceCompanyDemo";
import {seedShopBlogDemoData} from "@eCommerceModule/database/demo/blog.demo";
import {createGiftCards} from "@eCommerceModule/database/demo/giftCards.demo";
import {createPaymentTransactions} from "@eCommerceModule/database/demo/paymentTransactions.demo";
import {createECommerceNotifications} from "@eCommerceModule/database/demo/notifications.demo";

/**
 * After property management (20). Seeds the catalog, then the shop blog demo data, then the finance ledger rows
 * that hang off those orders (eCommerce depends on finance, not the other way round).
 */
export const companyDemoSeedOrder = 30;

export async function seedCompanyDemoData(parentLogger: serverLogger | undefined, company: any): Promise<void> {
    const logger = getLogger("eCommerce_company_demo_seed", parentLogger);
    await createECommerceRoleUsers(logger, company);
    await seedECommerceDemoData(logger, company);
    await seedShopBlogDemoData(logger, company);
    const giftCards = await createGiftCards(logger, company);
    // The notice names the demo gift card: only where it was seeded.
    if (giftCards.length > 0) await createECommerceNotifications(logger, company);
    await createPaymentTransactions(logger, company);
}
