import {registerCronHandler} from "@coreModule/cronjobs/registry/handlerRegistry";
import {runOrderAutoComplete} from "@eCommerceModule/utilities/cronJobs/orderAutoCompleteJob";
import {runTaskRequestExpiry} from "@eCommerceModule/utilities/cronJobs/taskRequestExpiryJob";
import {runLowStockAlert} from "@eCommerceModule/utilities/cronJobs/lowStockAlertJob";
import {runCollectionRebuild} from "@eCommerceModule/utilities/cronJobs/collectionRebuildJob";
import {runScheduledPublish} from "@eCommerceModule/utilities/cronJobs/scheduledPublishJob";

export function registerECommerceCronHandlers(): void {
    registerCronHandler({
        code: "eCommerce.orderAutoComplete",
        handler: async ctx => {
            await runOrderAutoComplete(ctx.logger);
        },
        version: "1",
    });

    registerCronHandler({
        code: "eCommerce.taskRequestExpiry",
        handler: async ctx => {
            await runTaskRequestExpiry(ctx.logger);
        },
        version: "1",
    });

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
}
