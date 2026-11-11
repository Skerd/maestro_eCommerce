import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
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
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosOrderSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.schema-def";
import {applyPosOrderIndexes} from "./posOrder.indexes";
import {posOrderViews} from "./posOrder.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {IFiscalConfig} from "@financeModule/database/schemas/fiscalConfig/fiscalConfig";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {POS_FISCAL_RESOLUTIONS, type PosFiscalResolution} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.dto";

export type PosOrderState = "draft" | "paid" | "cancel" | "refunded";

export interface IPosOrderLine {
    product: IProduct | Types.ObjectId;
    variant?: IProductVariant | Types.ObjectId;
    quantity: number;
    /** Cumulative qty already refunded against this sale line. */
    quantityRefunded?: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    priceSubtotal: number;
    priceTotal: number;
    taxAmount: number;
    productName: string;
    productSku?: string;
    barcode?: string;
    /** Mongoose adds it when the line is set on the order; a line built at the till has none yet. */
    _id?: Types.ObjectId;
}

export interface IPosOrderPayment {
    paymentMethod: IPosPaymentMethod | Types.ObjectId;
    /** Denormalized so historical orders keep method details. */
    paymentMethodName?: string;
    paymentMethodType?: string;
    amount: number;
    paymentDate: Date;
    terminalAuthCode?: string;
    terminalReference?: string;
    terminalId?: string;
    /** Mongoose adds it when the payment is set on the order; a payment built at the till has none yet. */
    _id?: Types.ObjectId;
}

export interface IPosOrder extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    session: IPosSession | Types.ObjectId;
    config: IPosConfig | Types.ObjectId;
    /** The till's currency when the sale was made; its amounts are in it (UX-07). */
    currency?: ICurrency | Types.ObjectId;
    state: PosOrderState;
    cashier: IUser | Types.ObjectId;
    customer?: IUser | Types.ObjectId;
    customerName?: string;
    lines: IPosOrderLine[];
    payments: IPosOrderPayment[];
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
    productOrder?: IProductOrder;
    refundOf?: IPosOrder;
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
    /** TCR cash-register code at the time of fiscalization. */
    fiscalTcrCode?: string;
    fiscalOperatorCode?: string;
    fiscalBusinessUnitCode?: string;
    /** CIS TypeOfInv: CASH or NONCASH. */
    fiscalTypeOfInv?: string;
    fiscalConfig?: IFiscalConfig;
    fiscalizedAt?: Date;
    einvoiceAt?: Date;
    fiscalError?: string;
    fiscalRequestXml?: string;
    /**
     * Set just before the sale is sent to CIS and cleared when CIS's answer is stored. Set without codes, CIS may have
     * registered the sale and the answer was lost, so it is never sent again automatically (TD-B75). Internal.
     */
    fiscalRegisteringAt?: Date;
    /** Who resolved a sale left with `fiscalRegisteringAt` and no codes, when, and how (D98). */
    fiscalResolution?: PosFiscalResolution;
    fiscalResolvedBy?: IUser | Types.ObjectId;
    fiscalResolvedAt?: Date;
    ublXml?: string;
    company: ICompany;
}

const NoWritePermission = {
    self: {
        write: "no-permission",
    },
    others: {
        write: "no-permission",
    },
};

const HideFromTable = {hideColumn: true} as const;

/** Required paths the server sets: the order number, its till and session, lines, payments, amounts and state. */
const POS_ORDER_SERVER_OWNED = ["name", "session", "config", "cashier"];

const PosOrderSchema = new Schema<IPosOrder>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            permissions: NoWritePermission,
        },
        session: {
            type: SchemaTypes.ObjectId,
            ref: "PosSession",
            required: true,
            refAllowlist: PosSessionSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name"],
            },
        },
        config: {
            type: SchemaTypes.ObjectId,
            ref: "PosConfig",
            required: true,
            refAllowlist: PosConfigSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name"],
            },
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["symbol"],
                hideColumn: true,
            },
        },
        state: {
            type: SchemaTypes.String,
            enum: ["draft", "paid", "cancel", "refunded"],
            default: "draft",
            dynamicTableConfiguration: {
                enumTones: {
                    draft:      "neutral",
                    paid:       "success",
                    cancel:     "danger",
                    refunded:   "danger",
                },
            },
        },
        cashier: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        customer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        customerName: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        lines: {
            type: [{
                product: {
                    type: SchemaTypes.ObjectId,
                    ref: "Product",
                    required: true,
                    refAllowlist: ProductSimpleSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                variant: {
                    type: SchemaTypes.ObjectId,
                    ref: "ProductVariant",
                    refAllowlist: ProductVariantSimpleSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                quantity: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                /** Cumulative qty already refunded against this sale line. */
                quantityRefunded: {
                    type: SchemaTypes.Number,
                    default: 0,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                unitPrice: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                discountPercent: {
                    type: SchemaTypes.Number,
                    default: 0,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                discountAmount: {
                    type: SchemaTypes.Number,
                    default: 0,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                priceSubtotal: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                priceTotal: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                taxAmount: {
                    type: SchemaTypes.Number,
                    default: 0,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                productName: {
                    type: SchemaTypes.String,
                    required: true,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                productSku: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                barcode: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
            }],
            default: [],
            permissions: NoWritePermission,
            /** objectId cell → badges; label from each line via refDisplayKey. */
            dynamicTableConfiguration: {
                cellType: COLUMN_TYPE.OBJECT_ID,
                refDisplayKey: ["quantity", "!x ", "productName"],
                maxInlineItems: 1,
                filterable: false,
                sortable: false,
            },
        },
        payments: {
            type: [{
                paymentMethod: {
                    type: SchemaTypes.ObjectId,
                    ref: "PosPaymentMethod",
                    required: true,
                    refAllowlist: PosPaymentMethodSimpleSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                /** Denormalized so historical orders keep method details. */
                paymentMethodName: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                paymentMethodType: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                amount: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                paymentDate: {
                    type: SchemaTypes.Date,
                    default: Date.now,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                terminalAuthCode: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                terminalReference: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                terminalId: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
            }],
            default: [],
            permissions: NoWritePermission,
        },
        amountTax: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        amountTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        amountPaid: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        amountReturn: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        discountTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        /** Sum of refund amounts issued against this sale (partial + full). */
        amountRefunded: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
        },
        note: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        orderDiscountPercent: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        clientRequestId: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        productOrder: {
            type: SchemaTypes.ObjectId,
            ref: "ProductOrder",
            refAllowlist: ProductOrderSimpleSnippet,
            permissions: NoWritePermission,
        },
        refundOf: {
            type: SchemaTypes.ObjectId,
            ref: "PosOrder",
            refAllowlist: PosOrderSimpleSnippet,
            permissions: NoWritePermission,
        },
        isRefund: {
            type: SchemaTypes.Boolean,
            default: false,
            permissions: NoWritePermission,
        },
        nslf: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        iicSignature: {
            type: SchemaTypes.String,
            select: false,
            permissions: NoWritePermission,
        },
        nivf: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        eic: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        qrVerifyUrl: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        fiscalIssueDateTime: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        fiscalInvNum: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        fiscalInvOrdNum: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        fiscalTcrCode: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        fiscalOperatorCode: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        fiscalBusinessUnitCode: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        fiscalTypeOfInv: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        fiscalConfig: {
            type: SchemaTypes.ObjectId,
            ref: "FiscalConfig",
            permissions: NoWritePermission,
        },
        fiscalizedAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        einvoiceAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        fiscalError: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        fiscalRequestXml: {
            type: SchemaTypes.String,
            select: false,
            permissions: NoWritePermission,
        },
        fiscalRegisteringAt: {
            type: SchemaTypes.Date,
            select: false,
            permissions: NoWritePermission,
        },
        fiscalResolution: {
            type: SchemaTypes.String,
            enum: POS_FISCAL_RESOLUTIONS,
            permissions: NoWritePermission,
        },
        fiscalResolvedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        fiscalResolvedAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        ublXml: {
            type: SchemaTypes.String,
            select: false,
            permissions: NoWritePermission,
        },
    },
    {
        accessMode: "loose",
        permissions: {
            self: {
                create: "no-permission",
            },
            others: {
                create: "no-permission",
            },
        },
        timestamps: true,
    },
);

ownershipPlugin(PosOrderSchema);
auditPlugin(PosOrderSchema);
softDeletePlugin(PosOrderSchema);
lifeCyclePlugin(PosOrderSchema);
validateSchemaDefAgainstMongoose(PosOrderSchema, PosOrderSchemaDef, "PosOrder", POS_ORDER_SERVER_OWNED);
applyPosOrderIndexes(PosOrderSchema);
const PosOrder = model<IPosOrder>("PosOrder", PosOrderSchema);
normalizeSchemaPermissions(PosOrder);
export default PosOrder;

addModelData(PosOrder, posOrderViews);