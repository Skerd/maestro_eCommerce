import type {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import type {PosSession} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {PosConfigSimple} from "armonia/src/modules/eCommerce/dto/posConfig.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";

export function posSessionToDTO(session: IPosSession): PosSession {
    const currency =
        mapSnippet<CurrencySimple>()(session.currency, CurrencySimpleSnippet)
        ?? mapSnippet<CurrencySimple>()(session.config?.currency, CurrencySimpleSnippet);
    return {
        _id: session._id.toString(),
        name: session.name,
        config: mapSnippet<PosConfigSimple>()(session.config, PosConfigSimpleSnippet)!,
        currency,
        state: session.state,
        openedBy: mapSnippet<SimpleBlankUser>()(session.openedBy, SimpleBlankUserSnippet),
        closedBy: mapSnippet<SimpleBlankUser>()(session.closedBy, SimpleBlankUserSnippet),
        openedAt: session.openedAt?.toISOString?.(),
        closedAt: session.closedAt?.toISOString?.(),
        openingBalance: session.openingBalance,
        closingBalance: session.closingBalance,
        expectedCash: session.expectedCash,
        cashRegisterBalance: session.cashRegisterBalance,
        cashMoves: session.cashMoves?.map((move) => ({
            type: move.type,
            amount: move.amount,
            currency,
            reason: move.reason,
            at: move.at?.toISOString?.(),
            by: mapSnippet<SimpleBlankUser>()(move.by, SimpleBlankUserSnippet),
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
