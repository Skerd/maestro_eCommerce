import {registerCronHandler} from "@coreModule/cronjobs/registry/handlerRegistry";
import {runLowStockAlert} from "@eCommerceModule/utilities/cronJobs/lowStockAlertJob";
import {runScheduledPublish} from "@eCommerceModule/utilities/cronJobs/scheduledPublishJob";
import {runCheckoutExpiry} from "@eCommerceModule/utilities/cronJobs/checkoutExpiryJob";
import {runAbandonedCart} from "@eCommerceModule/utilities/cronJobs/abandonedCartJob";
import {runShopHostProbe} from "@eCommerceModule/utilities/cronJobs/shopHostProbeJob";
import {runOrderAutoComplete} from "@eCommerceModule/utilities/cronJobs/orderAutoCompleteJob";
import {runTaskRequestExpiry} from "@eCommerceModule/utilities/cronJobs/taskRequestExpiryJob";

export function registerECommerceCronHandlers(): void {
    registerCronHandler({
        code: "eCommerce.lowStockAlert",
        handler: async ctx => {
            await runLowStockAlert(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Low stock alert",
            cronExpression: "0 0 * * * *",
            priority: 10,
        },
    });

    registerCronHandler({
        code: "eCommerce.scheduledPublish",
        handler: async ctx => {
            await runScheduledPublish(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Scheduled publish",
            cronExpression: "0 */5 * * * *",
            priority: 25,
        },
    });

    registerCronHandler({
        code: "eCommerce.checkoutExpiry",
        handler: async ctx => {
            await runCheckoutExpiry(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Checkout expiry",
            cronExpression: "0 15 * * * *",
            priority: 20,
        },
    });

    registerCronHandler({
        code: "eCommerce.abandonedCart",
        handler: async ctx => {
            await runAbandonedCart(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Abandoned cart reminders",
            cronExpression: "0 45 * * * *",
            priority: 10,
        },
    });

    registerCronHandler({
        code: "eCommerce.shopHostProbe",
        handler: async ctx => {
            await runShopHostProbe(ctx);
        },
        defaultJob: {
            name: "Shop host probe",
            cronExpression: "0 */1 * * * *",
            priority: 15,
        },
    });

    registerCronHandler({
        code: "eCommerceMarketplace.orderAutoComplete",
        handler: async ctx => {
            await runOrderAutoComplete(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Order auto-complete",
            cronExpression: "0 0 * * * *",
            priority: 20,
        },
    });

    registerCronHandler({
        code: "eCommerceMarketplace.taskRequestExpiry",
        handler: async ctx => {
            await runTaskRequestExpiry(ctx.company, ctx.logger);
        },
        defaultJob: {
            name: "Task request expiry",
            cronExpression: "0 0 * * * *",
            priority: 20,
        },
    });
}
