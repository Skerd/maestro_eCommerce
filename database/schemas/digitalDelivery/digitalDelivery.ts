import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import {IOwnershipPluginFields} from "@coreModule/database/types/plugin-fields";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";

/**
 * A buyer's entitlement to download a digital product's files, issued when the
 * order is paid. The token is the secret — the public download route needs
 * nothing else. Media ids are snapshotted so later product edits don't change
 * what was bought. System-internal: no CRUD router, no panel.
 */
export interface IDigitalDelivery extends Document, IOwnershipPluginFields {
    order: Schema.Types.ObjectId;
    product: Schema.Types.ObjectId;
    customer: IUser;
    token: string;
    media: Schema.Types.ObjectId[];
    downloadLimit: number;
    downloadCount: number;
    expiresAt?: Date;
    company: ICompany;
}

const DigitalDeliverySchema = new Schema<IDigitalDelivery>(
    {
        order: {type: SchemaTypes.ObjectId, ref: "ProductOrder", required: true},
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        customer: {type: SchemaTypes.ObjectId, ref: "User", required: true, refAllowlist: SimpleUserSnippet},
        token: {type: SchemaTypes.String, required: true},
        media: {type: [{type: SchemaTypes.ObjectId, ref: "Media"}], default: []},
        downloadLimit: {type: SchemaTypes.Number, required: true, min: 1},
        downloadCount: {type: SchemaTypes.Number, default: 0, min: 0},
        expiresAt: {type: SchemaTypes.Date},
        company: {type: SchemaTypes.ObjectId, ref: "Company", required: true, refAllowlist: CompanyBlankSnippet},
    },
    {accessMode: "loose", timestamps: true},
);

DigitalDeliverySchema.index({token: 1}, {unique: true});
DigitalDeliverySchema.index({order: 1, product: 1}, {unique: true});
DigitalDeliverySchema.index({customer: 1, company: 1});

ownershipPlugin(DigitalDeliverySchema);
auditPlugin(DigitalDeliverySchema);
const DigitalDelivery = model<IDigitalDelivery>("DigitalDelivery", DigitalDeliverySchema);
normalizeSchemaPermissions(DigitalDelivery);
export default DigitalDelivery;
