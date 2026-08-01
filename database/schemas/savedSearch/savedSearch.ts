import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {SavedSearchSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.schema-def";
import {applySavedSearchIndexes} from "./savedSearch.indexes";
import {savedSearchViews} from "./savedSearch.views";

export interface ISavedSearchFilters {
    title?: string;
    categoryId?: string;
    location?: string;
    tags?: string[];
    geoLat?: number;
    geoLng?: number;
    geoMaxKm?: number;
}

export interface ISavedSearch extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    user: IUser;
    company: ICompany;
    name: string;
    filters: ISavedSearchFilters;
}

const SavedSearchFiltersSubSchema = new Schema<ISavedSearchFilters>(
    {
        title: {type: SchemaTypes.String},
        categoryId: {type: SchemaTypes.String},
        location: {type: SchemaTypes.String},
        tags: {type: [SchemaTypes.String], default: undefined},
        geoLat: {type: SchemaTypes.Number},
        geoLng: {type: SchemaTypes.Number},
        geoMaxKm: {type: SchemaTypes.Number},
    },
    {_id: false},
);

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
            type: SavedSearchFiltersSubSchema,
            default: {},
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(SavedSearchSchema);
auditPlugin(SavedSearchSchema);
softDeletePlugin(SavedSearchSchema);
applySavedSearchIndexes(SavedSearchSchema);
lifeCyclePlugin(SavedSearchSchema);
const SavedSearch = model<ISavedSearch>("SavedSearch", SavedSearchSchema);
normalizeSchemaPermissions(SavedSearch);
export default SavedSearch;

addModelData(SavedSearch, savedSearchViews);
// user is injected from the session on create — not a form SchemaDef field.
validateSchemaDefAgainstMongoose(SavedSearchSchema, SavedSearchSchemaDef, "SavedSearch", ["user"]);
