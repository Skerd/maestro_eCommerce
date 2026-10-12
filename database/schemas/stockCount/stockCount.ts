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
    STOCK_COUNT_NOTE_MAX,
    StockCountSchemaDef,
    stockCountStatuses,
    type StockCountStatus,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/stockCount.schema-def";
import {applyStockCountIndexes} from "./stockCount.indexes";
import {stockCountViews} from "./stockCount.views";

/**
 * A physical count of one warehouse. Created as a draft holding the expected
 * (on-hand) quantity of every stock row there; staff enter what they counted,
 * and applying it sets on-hand to the count with an `adjustment` movement per
 * difference.
 */
export interface IStockCount extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    warehouse: IWarehouse;
    lines: {
        product: IProduct;
        variant?: IProductVariant;
        expectedQuantity: number;
        countedQuantity?: number;
    }[];
    status: StockCountStatus;
    note?: string;
    appliedBy?: IUser;
    appliedAt?: Date;
    company: ICompany;
}

const StockCountSchema = new Schema<IStockCount>(
    {
        warehouse: {
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
                    // Set by the server from the stock row, never entered
                    expectedQuantity: {
                        type: SchemaTypes.Number,
                        default: 0,
                    },
                    countedQuantity: {
                        type: SchemaTypes.Number,
                        min: 0,
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        status: {
            type: SchemaTypes.String,
            enum: [...stockCountStatuses],
            default: "draft",
            dynamicTableConfiguration: {
                enumTones: {
                    draft:      "warning",
                    applied:    "success",
                    cancelled:  "neutral",
                },
            },
        },
        note: {
            type: SchemaTypes.String,
            maxlength: STOCK_COUNT_NOTE_MAX,
        },
        appliedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
        },
        appliedAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(StockCountSchema);
auditPlugin(StockCountSchema);
softDeletePlugin(StockCountSchema);
applyStockCountIndexes(StockCountSchema);
lifeCyclePlugin(StockCountSchema);
const StockCount = model<IStockCount>("StockCount", StockCountSchema);
normalizeSchemaPermissions(StockCount);
export default StockCount;

addModelData(StockCount, stockCountViews);
validateSchemaDefAgainstMongoose(StockCountSchema, StockCountSchemaDef, "StockCount");
