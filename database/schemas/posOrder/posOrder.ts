import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosOrderSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.schema-def";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {PosPaymentMethodSimpleSnippet} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {PosSessionSimpleSnippet} from "@eCommerceModule/database/schemas/posSession/posSession.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {PosOrderSimpleSnippet} from "@eCommerceModule/database/schemas/posOrder/posOrder.snippets";
import {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import {applyPosOrderIndexes} from "./posOrder.indexes";
import {posOrderViews} from "./posOrder.views";

export type PosOrderState = "draft" | "paid" | "cancel" | "refunded";

const PosOrderLineSubSchema = new Schema(
    {
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant", refAllowlist: ProductVariantSimpleSnippet},
        quantity: {type: SchemaTypes.Number, required: true, min: 0},
        /** Cumulative qty already refunded against this sale line. */
        quantityRefunded: {type: SchemaTypes.Number, default: 0, min: 0},
        unitPrice: {type: SchemaTypes.Number, required: true, min: 0},
        discountPercent: {type: SchemaTypes.Number, default: 0, min: 0},
        discountAmount: {type: SchemaTypes.Number, default: 0, min: 0},
        priceSubtotal: {type: SchemaTypes.Number, required: true, min: 0},
        priceTotal: {type: SchemaTypes.Number, required: true, min: 0},
        taxAmount: {type: SchemaTypes.Number, default: 0, min: 0},
        productName: {type: SchemaTypes.String, required: true},
        productSku: {type: SchemaTypes.String},
        barcode: {type: SchemaTypes.String},
    },
    {_id: true},
);

const PosOrderPaymentSubSchema = new Schema(
    {
        paymentMethod: {
            type: SchemaTypes.ObjectId,
            ref: "PosPaymentMethod",
            required: true,
            refAllowlist: PosPaymentMethodSimpleSnippet,
        },
        /** Denormalized so historical orders keep method details. */
        paymentMethodName: {type: SchemaTypes.String},
        paymentMethodType: {type: SchemaTypes.String},
        amount: {type: SchemaTypes.Number, required: true, min: 0},
        paymentDate: {type: SchemaTypes.Date, default: Date.now},
        terminalAuthCode: {type: SchemaTypes.String},
        terminalReference: {type: SchemaTypes.String},
        terminalId: {type: SchemaTypes.String},
    },
    {_id: true},
);

export interface IPosOrder extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    session: IPosSession;
    config: IPosConfig;
    state: PosOrderState;
    cashier: IUser;
    customer?: IUser;
    customerName?: string;
    lines: typeof PosOrderLineSubSchema[];
    payments: typeof PosOrderPaymentSubSchema[];
    amountTax: number;
    amountTotal: number;
    amountPaid: number;
    amountReturn: number;
    discountTotal: number;
    /** Sum of refund amounts issued against this sale. */
    amountRefunded?: number;
    note?: string;
    /** Order-level discount % (used for draft/held carts and pay). */
    orderDiscountPercent?: number;
    /** Client-supplied idempotency key for pay retries. */
    clientRequestId?: string;
    productOrder?: Schema.Types.ObjectId;
    refundOf?: Schema.Types.ObjectId;
    isRefund: boolean;
    /** Albanian CIS / e-invoice fields */
    nslf?: string;
    iicSignature?: string;
    nivf?: string;
    eic?: string;
    qrVerifyUrl?: string;
    fiscalIssueDateTime?: string;
    fiscalInvNum?: string;
    fiscalInvOrdNum?: string;
    fiscalConfig?: Schema.Types.ObjectId;
    fiscalizedAt?: Date;
    einvoiceAt?: Date;
    fiscalError?: string;
    fiscalRequestXml?: string;
    ublXml?: string;
    company: ICompany;
}

const PosOrderSchema = new Schema<IPosOrder>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        session: {
            type: SchemaTypes.ObjectId,
            ref: "PosSession",
            required: true,
            refAllowlist: PosSessionSimpleSnippet,
            dynamicTableConfiguration: {
                dtoPath: "sessionLabel",
                refDisplayKey: ["name"],
            },
        },
        config: {
            type: SchemaTypes.ObjectId,
            ref: "PosConfig",
            required: true,
            refAllowlist: PosConfigSimpleSnippet,
            dynamicTableConfiguration: {
                dtoPath: "configLabel",
                refDisplayKey: ["name"],
            },
        },
        state: {
            type: SchemaTypes.String,
            enum: ["draft", "paid", "cancel", "refunded"],
            default: "draft",
        },
        cashier: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        customer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        customerName: {type: SchemaTypes.String},
        lines: {type: [PosOrderLineSubSchema], default: []},
        payments: {type: [PosOrderPaymentSubSchema], default: []},
        amountTax: {type: SchemaTypes.Number, default: 0, min: 0},
        amountTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        amountPaid: {type: SchemaTypes.Number, default: 0, min: 0},
        amountReturn: {type: SchemaTypes.Number, default: 0, min: 0},
        discountTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        /** Sum of refund amounts issued against this sale (partial + full). */
        amountRefunded: {type: SchemaTypes.Number, default: 0, min: 0},
        note: {type: SchemaTypes.String},
        orderDiscountPercent: {type: SchemaTypes.Number, default: 0, min: 0},
        clientRequestId: {type: SchemaTypes.String, trim: true},
        productOrder: {type: SchemaTypes.ObjectId, ref: "ProductOrder", refAllowlist: ProductOrderSimpleSnippet},
        refundOf: {type: SchemaTypes.ObjectId, ref: "PosOrder", refAllowlist: PosOrderSimpleSnippet},
        isRefund: {type: SchemaTypes.Boolean, default: false},
        nslf: {type: SchemaTypes.String, trim: true},
        iicSignature: {type: SchemaTypes.String, select: false},
        nivf: {type: SchemaTypes.String, trim: true},
        eic: {type: SchemaTypes.String, trim: true},
        qrVerifyUrl: {type: SchemaTypes.String},
        fiscalIssueDateTime: {type: SchemaTypes.String},
        fiscalInvNum: {type: SchemaTypes.String},
        fiscalInvOrdNum: {type: SchemaTypes.String},
        fiscalConfig: {type: SchemaTypes.ObjectId, ref: "FiscalConfig"},
        fiscalizedAt: {type: SchemaTypes.Date},
        einvoiceAt: {type: SchemaTypes.Date},
        fiscalError: {type: SchemaTypes.String},
        fiscalRequestXml: {type: SchemaTypes.String, select: false},
        ublXml: {type: SchemaTypes.String, select: false},
    },
    {accessMode: "loose", timestamps: true},
);

ownershipPlugin(PosOrderSchema);
auditPlugin(PosOrderSchema);
softDeletePlugin(PosOrderSchema);
applyPosOrderIndexes(PosOrderSchema);
const PosOrder = model<IPosOrder>("PosOrder", PosOrderSchema);
normalizeSchemaPermissions(PosOrder);
export default PosOrder;

addModelData(PosOrder, posOrderViews);
// SchemaDef is intentionally empty — PosOrders are created by the till pay API.
validateSchemaDefAgainstMongoose(PosOrderSchema, PosOrderSchemaDef, "PosOrder", [
    "name",
    "session",
    "config",
    "state",
    "cashier",
    "customer",
    "customerName",
    "lines",
    "payments",
    "amountTax",
    "amountTotal",
    "amountPaid",
    "amountReturn",
    "discountTotal",
    "amountRefunded",
    "note",
    "orderDiscountPercent",
    "clientRequestId",
    "productOrder",
    "refundOf",
    "isRefund",
    "nslf",
    "iicSignature",
    "nivf",
    "eic",
    "qrVerifyUrl",
    "fiscalIssueDateTime",
    "fiscalInvNum",
    "fiscalInvOrdNum",
    "fiscalConfig",
    "fiscalizedAt",
    "einvoiceAt",
    "fiscalError",
    "fiscalRequestXml",
    "ublXml",
]);
