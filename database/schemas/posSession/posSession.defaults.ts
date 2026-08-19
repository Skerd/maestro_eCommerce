import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import PosSession, {type IPosSession} from "./posSession";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ECOM_DEMO_TAG} from "@eCommerceModule/database/demo/ecomDemoConstants";

export const POS_SESSION_NAME = `${ECOM_DEMO_TAG}:pos-session-1`;

/**
 * Seeds one closed till session. Unique on `{company, name}`.
 */
export async function createPosSessions(
    parentLogger: serverLogger,
    company: ICompany,
    configId: Types.ObjectId | undefined,
    cashierId: Types.ObjectId,
): Promise<HydratedDocument<IPosSession> | undefined> {
    const logger = getLogger("mongoDbInitialization-createPosSessions", parentLogger);
    logger.start("Creating POS sessions...");

    if (!configId) {
        logger.warn("Skipping POS session: POS config was not seeded.");
        logger.finish("Finished creating POS sessions!", 0);
        return undefined;
    }

    try {
        const payload = {
            name: POS_SESSION_NAME,
            config: configId,
            state: "closed" as const,
            openedBy: cashierId,
            closedBy: cashierId,
            openedAt: dayjs().subtract(2, "day").toDate(),
            closedAt: dayjs().subtract(1, "day").toDate(),
            openingBalance: 100,
            closingBalance: 182.8,
            expectedCash: 182.8,
            cashRegisterBalance: 182.8,
            cashMoves: [],
            orderCount: 1,
            totalSales: 82.8,
            totalCash: 82.8,
            totalCard: 0,
            notes: ECOM_DEMO_TAG,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await PosSession.findOne({company: company._id, name: POS_SESSION_NAME});
        if (!doc) {
            doc = await PosSession.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating POS sessions!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating POS session: ${message}`);
        logger.fail("Failed to create POS sessions!");
        return undefined;
    }
}
