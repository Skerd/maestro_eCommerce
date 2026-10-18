import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IListing } from "@eCommerceModule/database/schemas/listing/listing";
import { ICurrency } from "@coreModule/database/schemas/currency/currency";
import { IUser } from "@coreModule/database/schemas/user/user";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    IOwnershipPluginFields,
    ILifeCyclePluginFields,
    ISoftDeletePluginFields
} from "@coreModule/database/types/plugin-fields";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { addModelData } from "@coreModule/database/collections";
import { validateSchemaDefAgainstMongoose } from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import { ListingPackageSchemaDef } from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingPackage/listingPackage.schema-def";
import { CurrencySimpleSnippet } from "@coreModule/database/schemas/currency/currency.snippets";
import { SimpleUserSnippet } from "@coreModule/database/schemas/user/user.snippets";
import { ListingSimpleSnippet } from "@eCommerceModule/database/schemas/listing/listing.snippets";
import { applyListingPackageIndexes } from "./listingPackage.indexes";
import { listingPackageViews } from "./listingPackage.views";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";

export interface IListingPackage extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    company: ICompany;
    listing: IListing;
    provider: IUser;
    name: string;
    description?: string;
    price: {
        amount: number;
        currency: ICurrency;
    };
    deliveryDays: number;
    order: number;
}

const ListingPackageSchema = new Schema<IListingPackage>(
    {
        listing: {
            type: SchemaTypes.ObjectId,
            ref: "Listing",
            required: true,
            refAllowlist: ListingSimpleSnippet,
        },
        provider: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
            permissions: {
                self: {write: "no-permission"},
                others: {write: "no-permission"},
            },
        },
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        description: {
            type: SchemaTypes.String,
            default: "",
        },
        price: {
            type: {
                amount: {
                    type: SchemaTypes.Number,
                    required: true,
                    default: 0,
                },
                currency: {
                    type: SchemaTypes.ObjectId,
                    ref: "Currency",
                    required: true,
                    refAllowlist: CurrencySimpleSnippet,
                },
            }
        },
        deliveryDays: {
            type: SchemaTypes.Number,
            required: true,
            default: 1,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0,
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(ListingPackageSchema);
auditPlugin(ListingPackageSchema);
softDeletePlugin(ListingPackageSchema);
lifeCyclePlugin(ListingPackageSchema);
applyListingPackageIndexes(ListingPackageSchema);
const ListingPackage = model<IListingPackage>("ListingPackage", ListingPackageSchema);
normalizeSchemaPermissions(ListingPackage);
export default ListingPackage;

addModelData(ListingPackage, listingPackageViews);
validateSchemaDefAgainstMongoose(ListingPackageSchema, ListingPackageSchemaDef, "ListingPackage", ["provider"]);
