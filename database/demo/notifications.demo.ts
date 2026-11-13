import {serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {NotificationImportance, NotificationStatus} from "@coreModule/database/schemas/notification/notification";
import {createNotifications, type DemoNotification} from "@coreModule/database/schemas/notification/notification.defaults";
import {NotificationCategory} from "armonia/src/modules/core/api/user/private/notifications/notifications.enum";

/** For echo, the customer of DEMO-ORD-1008 (a core user every dev profile has); the shop's notices live here, not in core (TD-B226). */
export const ECOMMERCE_DEMO_NOTIFICATIONS: readonly DemoNotification[] = [
    {
        code: "ecommerce-demo-seed:gift-card-issued",
        description: "Gift card DEMO-GIFT-50 was issued from DEMO-ORD-1008.",
        receiver: "echo@echo.com",
        importance: NotificationImportance.MEDIUM,
        status: NotificationStatus.Info,
        category: NotificationCategory.FINANCIAL,
    },
];

export async function createECommerceNotifications(logger: serverLogger, company: ICompany): Promise<void> {
    await createNotifications(logger, company, ECOMMERCE_DEMO_NOTIFICATIONS);
}
