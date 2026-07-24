import type {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import type {PosSession} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapUserLabel(user: any): {_id: string; name?: string; surname?: string} | undefined {
    if (!user) return undefined;
    return {
        _id: user._id?.toString?.() ?? user.toString?.() ?? "",
        name: user.name,
        surname: user.surname,
    };
}

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function posSessionToDTO(session: IPosSession): PosSession {
    const config = session.config as any;
    const cashMoves = ((session.cashMoves as any[]) ?? []).map(move => ({
        type: move.type,
        amount: move.amount,
        reason: move.reason,
        at: move.at instanceof Date ? move.at.toISOString() : move.at,
        by: mapUserLabel(move.by),
    }));

    return {
        _id: session._id.toString(),
        name: session.name,
        config: config?._id?.toString?.() ?? config?.toString?.() ?? "",
        configLabel: config?._id ? {_id: config._id.toString(), name: config.name ?? ""} : undefined,
        state: session.state,
        openedBy: mapUserLabel(session.openedBy),
        closedBy: mapUserLabel(session.closedBy),
        openedAt: session.openedAt instanceof Date ? session.openedAt.toISOString() : (session.openedAt as any),
        closedAt: session.closedAt instanceof Date ? session.closedAt.toISOString() : (session.closedAt as any),
        openingBalance: session.openingBalance,
        closingBalance: session.closingBalance,
        expectedCash: session.expectedCash,
        cashRegisterBalance: session.cashRegisterBalance,
        cashMoves,
        orderCount: session.orderCount,
        totalSales: session.totalSales,
        totalCash: session.totalCash,
        totalCard: session.totalCard,
        notes: session.notes,
        company: mapCompanyLabel(session.company),
        ...mapSoftDeleteToDTO(session),
        ...mapOwnershipToDTO(session),
    };
}

export function posSessionsToDTO(sessions: IPosSession[]): PosSession[] {
    return sessions.map(posSessionToDTO);
}

export function posSessionToSelect(session: IPosSession): ApiSelectDatum {
    return {value: session._id.toString(), label: session.name};
}

export function posSessionsToSelect(sessions: IPosSession[]): ApiSelectDatum[] {
    return sessions.map(posSessionToSelect);
}
