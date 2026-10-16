import type {OdooConnection} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooConnection/odooConnection.dto";
import type {IOdooConnection} from "@eCommerceModule/database/schemas/odooConnection/odooConnection";

export function odooConnectionToDTO(doc: IOdooConnection): OdooConnection {
    return {
        _id: doc._id.toString(),
        url: doc.url,
        database: doc.database,
        username: doc.username,
        hasApiKey: !!doc.apiKeyEncrypted,
    };
}
