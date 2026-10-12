import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
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
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    STOCK_TRANSFER_NOTE_MAX,
    StockTransferSchemaDef,
    stockTransferStatuses,
    type StockTransferStatus,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.schema-def";
import {applyStockTransferIndexes} from "./stockTransfer.indexes";
import {stockTransferViews} from "./stockTransfer.views";

/**
 * Moves free stock from one warehouse to another. A draft can be edited;
 * completing it takes the units out of the source and into the destination
 * (paired `transfer_out` / `transfer_in` movements). Done transfers are ledger.
 */
export interface IStockTransfer extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    fromWarehouse: IWarehouse;
    toWarehouse: IWarehouse;
    lines: {
        product: IProduct;
        variant?: IProductVariant;
        quantity: number;
    }[];
    status: StockTransferStatus;
    note?: string;
    doneBy?: IUser;
    doneAt?: Date;
    company: ICompany;
}

const StockTransferSchema = new Schema<IStockTransfer>(
    {
        fromWarehouse: {
            type: SchemaTypes.ObjectId,
            ref: "Warehouse",
            required: true,
            refAllowlist: WarehouseSimpleSnippet,
        },
        toWarehouse: {
            type: SchemaTypes.ObjectId,
            ref: "Warehouse",
            required: true,
            refAllowlist: WarehouseSimpleSnippet,
        },
        lines: {
            type: [
                {
                    product: {
                        type: SchemaTypes.ObjectId,
                        ref: "Product",
                        required: true,
                        refAllowlist: ProductSimpleSnippet,
                    },
                    variant: {
                        type: SchemaTypes.ObjectId,
                        ref: "ProductVariant",
                        refAllowlist: ProductVariantSimpleSnippet,
                    },
                    quantity: {
                        type: SchemaTypes.Number,
                        required: true,
                        min: 0.0001,
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        status: {
            type: SchemaTypes.String,
            enum: [...stockTransferStatuses],
            default: "draft",
            dynamicTableConfiguration: {
                enumTones: {
                    draft:      "warning",
                    done:       "success",
                    cancelled:  "neutral",
                },
            },
        },
        note: {
            type: SchemaTypes.String,
            maxlength: STOCK_TRANSFER_NOTE_MAX,
        },
        doneBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
        },
        doneAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(StockTransferSchema);
auditPlugin(StockTransferSchema);
softDeletePlugin(StockTransferSchema);
applyStockTransferIndexes(StockTransferSchema);
lifeCyclePlugin(StockTransferSchema);
const StockTransfer = model<IStockTransfer>("StockTransfer", StockTransferSchema);
normalizeSchemaPermissions(StockTransfer);
export default StockTransfer;

addModelData(StockTransfer, stockTransferViews);
validateSchemaDefAgainstMongoose(StockTransferSchema, StockTransferSchemaDef, "StockTransfer");
