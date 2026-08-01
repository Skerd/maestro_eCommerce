import type {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import type {PosSession} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {
    mapPopulatedRef,
    mapPopulatedSimpleUser,
} from "@coreModule/utilities/mappers/common.mapper";

export function posSessionToDTO(session: IPosSession): PosSession {
    return {
        _id: session._id.toString(),
        name: session.name,
        config: mapPopulatedRef(session.config),
        state: session.state,
        openedBy: mapPopulatedSimpleUser(session.openedBy),
        closedBy: mapPopulatedSimpleUser(session.closedBy),
        openedAt: session.openedAt?.toISOString?.(),
        closedAt: session.closedAt?.toISOString?.(),
        openingBalance: session.openingBalance,
        closingBalance: session.closingBalance,
        expectedCash: session.expectedCash,
        cashRegisterBalance: session.cashRegisterBalance,
        cashMoves: session.cashMoves?.map((move) => ({
            type: move.type,
            amount: move.amount,
            reason: move.reason,
            at: move.at?.toISOString?.(),
            by: mapPopulatedSimpleUser(move.by),
        })) ?? [],
        orderCount: session.orderCount,
        totalSales: session.totalSales,
        totalCash: session.totalCash,
        totalCard: session.totalCard,
        notes: session.notes,
        ...mapSoftDeleteToDTO(session),
        ...mapOwnershipToDTO(session),
        ...mapLifeCycleToDTO(session),
    };
}

export function posSessionsToDTO(sessions: IPosSession[]): PosSession[] {
    return sessions.map(posSessionToDTO);
}
