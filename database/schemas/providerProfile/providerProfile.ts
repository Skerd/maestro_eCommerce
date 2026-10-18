import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IUser } from "@coreModule/database/schemas/user/user";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { IMedia } from "@coreModule/database/schemas/media/media";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields} from "@coreModule/database/types/plugin-fields";
import { addModelData } from "@coreModule/database/collections";
import { validateSchemaDefAgainstMongoose } from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import { ProviderProfileSchemaDef } from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.schema-def";
import { MediaSimpleSnippet } from "@coreModule/database/schemas/media/media.snippets";
import { SimpleUserSnippet } from "@coreModule/database/schemas/user/user.snippets";
import { applyProviderProfileIndexes } from "./providerProfile.indexes";
import { providerProfileViews } from "./providerProfile.views";

export type IProviderAvailabilitySlot = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

export interface IProviderProfile extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    user: IUser;
    company: ICompany;
    skills?: string[];
    bio?: string;
    portfolio?: IMedia[];
    /** Weekly recurring availability windows. */
    availability?: IProviderAvailabilitySlot[];
    /** Stripe Connect Express account (payouts destination). System-managed via providerProfile actions. */
    stripeAccountId?: string;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
    stripeDetailsSubmitted?: boolean;
    stripeAccountSyncedAt?: Date;
}

const ProviderProfileSchema = new Schema<IProviderProfile>(
    {
        user: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
        },
        skills: {
            type: [SchemaTypes.String],
            default: [],
        },
        bio: {
            type: SchemaTypes.String,
            default: "",
            trim: true,
        },
        portfolio: {
            type: [
                {
                    type: SchemaTypes.ObjectId,
                    ref: "Media",
                    refAllowlist: MediaSimpleSnippet,
                },
            ],
            default: [],
        },
        availability: {
            type: [
                {
                    dayOfWeek: {
                        type: SchemaTypes.Number,
                        required: true,
                        min: 0,
                        max: 6,
                    },
                    startTime: {
                        type: SchemaTypes.String,
                        required: true,
                        trim: true,
                    },
                    endTime: {
                        type: SchemaTypes.String,
                        required: true,
                        trim: true,
                    },
                    _id: false,
                },
            ],
            default: [],
        } as any,
        stripeAccountId: {type: SchemaTypes.String, trim: true},
        stripeChargesEnabled: {type: SchemaTypes.Boolean, default: false},
        stripePayoutsEnabled: {type: SchemaTypes.Boolean, default: false},
        stripeDetailsSubmitted: {type: SchemaTypes.Boolean, default: false},
        stripeAccountSyncedAt: {type: SchemaTypes.Date},
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(ProviderProfileSchema);
auditPlugin(ProviderProfileSchema);
softDeletePlugin(ProviderProfileSchema);
lifeCyclePlugin(ProviderProfileSchema);
applyProviderProfileIndexes(ProviderProfileSchema);
const ProviderProfile = model<IProviderProfile>("ProviderProfile", ProviderProfileSchema);
normalizeSchemaPermissions(ProviderProfile);
export default ProviderProfile;

addModelData(ProviderProfile, providerProfileViews);
validateSchemaDefAgainstMongoose(ProviderProfileSchema, ProviderProfileSchemaDef, "ProviderProfile", [
    "user",
    // Stripe Connect fields are system-managed (actions + webhooks), never form-writable
    "stripeAccountId", "stripeChargesEnabled", "stripePayoutsEnabled", "stripeDetailsSubmitted", "stripeAccountSyncedAt",
]);
