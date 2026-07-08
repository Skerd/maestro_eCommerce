import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import {IOwnershipPluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {applyInventoryIndexes} from "./inventory.indexes";
import {inventoryViews} from "./inventory.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {InventorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.schema-def";

export interface IInventory extends Document, IOwnershipPluginFields {
    product: IProduct;
    variant?: IProductVariant;
    warehouse: IWarehouse;
    quantityOnHand: number;
    quantityReserved: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    lowStockAlertSent?: boolean;
    company: ICompany;
}

const InventorySchema = new Schema<IInventory>(
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
        warehouse: {
            type: SchemaTypes.ObjectId,
            ref: "Warehouse",
            required: true,
            refAllowlist: WarehouseSimpleSnippet,
        },
        quantityOnHand: {type: SchemaTypes.Number, default: 0, min: 0},
        quantityReserved: {type: SchemaTypes.Number, default: 0, min: 0},
        reorderPoint: {type: SchemaTypes.Number, min: 0},
        reorderQuantity: {type: SchemaTypes.Number, min: 0},
        lowStockAlertSent: {type: SchemaTypes.Boolean, default: false},
    },
    {
        accessMode: "loose",
        toJSON: {virtuals: true},
        toObject: {virtuals: true},
    },
);

// Virtual: available quantity = onHand - reserved
InventorySchema.virtual("quantityAvailable").get(function (this: IInventory) {
    return Math.max(0, this.quantityOnHand - this.quantityReserved);
});

ownershipPlugin(InventorySchema);
auditPlugin(InventorySchema);
applyInventoryIndexes(InventorySchema);
const Inventory = model<IInventory>("Inventory", InventorySchema);
normalizeSchemaPermissions(Inventory);
export default Inventory;

addModelData(Inventory, inventoryViews);
// excludePaths: quantityReserved (system-managed, not in SchemaDef), lowStockAlertSent (system-managed)
validateSchemaDefAgainstMongoose(InventorySchema, InventorySchemaDef, "Inventory", ["quantityReserved", "lowStockAlertSent"]);
