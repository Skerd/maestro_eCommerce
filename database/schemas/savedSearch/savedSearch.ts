import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IUser } from "@coreModule/database/schemas/user/user";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import { IOwnershipPluginFields } from "@coreModule/database/types/plugin-fields";
import { addModelData } from "@coreModule/database/collections";
import { CompanyBlankSnippet } from "@coreModule/database/schemas/company/company.snippets";
import { SimpleUserSnippet } from "@coreModule/database/schemas/user/user.snippets";
import { applySavedSearchIndexes } from "./savedSearch.indexes";
import { savedSearchViews } from "./savedSearch.views";

export interface ISavedSearch extends Document, IOwnershipPluginFields {
    user: IUser;
    company: ICompany;
    name: string;
    filters: {
        title?: string;
        categoryId?: string;
        location?: string;
        tags?: string[];
        geoLat?: number;
        geoLng?: number;
        geoMaxKm?: number;
    };
}

const SavedSearchSchema = new Schema<ISavedSearch>(
    {
        user: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
        },
        company: {
            type: SchemaTypes.ObjectId,
            ref: "Company",
            required: true,
            refAllowlist: CompanyBlankSnippet,
        },
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        filters: {
            type: SchemaTypes.Mixed,
            default: {},
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(SavedSearchSchema);
auditPlugin(SavedSearchSchema);
applySavedSearchIndexes(SavedSearchSchema);
const SavedSearch = model<ISavedSearch>("SavedSearch", SavedSearchSchema);
normalizeSchemaPermissions(SavedSearch);
export default SavedSearch;

addModelData(SavedSearch, savedSearchViews);
