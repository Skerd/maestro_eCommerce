import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IOrder } from "@eCommerceMarketplaceModule/database/schemas/order/order";
import { IMedia } from "@coreModule/database/schemas/media/media";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { addModelData } from "@coreModule/database/collections";
import { MediaSimpleSnippet } from "@coreModule/database/schemas/media/media.snippets";
import { OrderSimpleSnippet } from "@eCommerceMarketplaceModule/database/schemas/order/order.snippets";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import { IOwnershipPluginFields } from "@coreModule/database/types/plugin-fields";
import { applyOrderDeliveryIndexes } from "./orderDelivery.indexes";
import { orderDeliveryViews } from "./orderDelivery.views";

export type OrderDeliveryStatus = "submitted" | "accepted" | "revision_requested";

export interface IOrderDelivery extends Document, IOwnershipPluginFields {
    company: ICompany;
    order: IOrder;
    message?: string;
    attachments: IMedia[];
    status: OrderDeliveryStatus;
}

const OrderDeliverySchema = new Schema<IOrderDelivery>(
    {
        order: {
            type: SchemaTypes.ObjectId,
            ref: "Order",
            required: true,
            refAllowlist: OrderSimpleSnippet,
        },
        message: {
            type: SchemaTypes.String,
            default: "",
        },
        attachments: [
            {
                type: SchemaTypes.ObjectId,
                ref: "Media",
                refAllowlist: MediaSimpleSnippet,
            },
        ],
        status: {
            type: SchemaTypes.String,
            enum: ["submitted", "accepted", "revision_requested"],
            default: "submitted",
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(OrderDeliverySchema);
auditPlugin(OrderDeliverySchema);
applyOrderDeliveryIndexes(OrderDeliverySchema);
const OrderDelivery = model<IOrderDelivery>("OrderDelivery", OrderDeliverySchema);
normalizeSchemaPermissions(OrderDelivery);
export default OrderDelivery;

addModelData(OrderDelivery, orderDeliveryViews);
