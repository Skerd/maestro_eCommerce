import {registerCronHandler} from "@coreModule/cronjobs/registry/handlerRegistry";
import {runLowStockAlert} from "@eCommerceModule/utilities/cronJobs/lowStockAlertJob";
import {runCollectionRebuild} from "@eCommerceModule/utilities/cronJobs/collectionRebuildJob";
import {runScheduledPublish} from "@eCommerceModule/utilities/cronJobs/scheduledPublishJob";
import {runCheckoutExpiry} from "@eCommerceModule/utilities/cronJobs/checkoutExpiryJob";
import {runAbandonedCart} from "@eCommerceModule/utilities/cronJobs/abandonedCartJob";

export function registerECommerceCronHandlers(): void {
    registerCronHandler({
        code: "eCommerce.lowStockAlert",
        handler: async ctx => {
            await runLowStockAlert(ctx.logger);
        },
        version: "1",
    });

    registerCronHandler({
        code: "eCommerce.collectionRebuild",
        handler: async ctx => {
            await runCollectionRebuild(ctx.logger);
        },
        version: "1",
    });

    registerCronHandler({
        code: "eCommerce.scheduledPublish",
        handler: async ctx => {
            await runScheduledPublish(ctx.logger);
        },
        version: "1",
    });

    registerCronHandler({
        code: "eCommerce.checkoutExpiry",
        handler: async ctx => {
            await runCheckoutExpiry(ctx.logger);
        },
        version: "1",
    });

    registerCronHandler({
        code: "eCommerce.abandonedCart",
        handler: async ctx => {
            await runAbandonedCart(ctx.logger);
        },
        version: "1",
    });
}
