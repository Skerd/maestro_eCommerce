import type {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function posSessionToSelect(session: IPosSession): ApiSelectDatum {
    return {
        value: session._id.toString(),
        label: session.name,
    };
}

export function posSessionsToSelect(sessions: IPosSession[]): ApiSelectDatum[] {
    return sessions.map(posSessionToSelect);
}
