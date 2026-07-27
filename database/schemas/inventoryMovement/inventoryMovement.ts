import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {addModelData} from "@coreModule/database/collections";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {applyInventoryMovementIndexes} from "./inventoryMovement.indexes";
import {inventoryMovementViews} from "./inventoryMovement.views";

export type InventoryMovementReason =
    | "restock"
    | "sale"
    | "return"
    | "adjustment"
    | "damage"
    | "transfer_in"
    | "transfer_out"
    | "initial"
    | "write_off";

export interface IInventoryMovement extends Document {
    /** Owning inventory row — preferred link for sheet history. */
    inventory?: IInventory;
    product: IProduct;
    variant?: IProductVariant;
    warehouse: IWarehouse;
    quantity: number;
    reason: InventoryMovementReason;
    note?: string;
    quantityBefore: number;
    quantityAfter: number;
    manufacturer?: string;
    receiptNumber?: string;
    receipts?: IMedia[];
    occurredAt?: Date;
    unitCost?: number;
    batchLot?: string;
    expiryDate?: Date;
    performedBy?: IUser;
    referenceType?: string;
    referenceId?: Schema.Types.ObjectId;
    company: ICompany;
    createdAt?: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
    {
        inventory: {type: SchemaTypes.ObjectId, ref: "Inventory", refAllowlist: InventorySimpleSnippet},
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant", refAllowlist: ProductVariantSimpleSnippet},
        warehouse: {type: SchemaTypes.ObjectId, ref: "Warehouse", required: true, refAllowlist: WarehouseSimpleSnippet},
        quantity: {type: SchemaTypes.Number, required: true},
        reason: {
            type: SchemaTypes.String,
            enum: ["restock", "sale", "return", "adjustment", "damage", "transfer_in", "transfer_out", "initial", "write_off"],
            required: true,
        },
        note: {type: SchemaTypes.String},
        quantityBefore: {type: SchemaTypes.Number, required: true},
        quantityAfter: {type: SchemaTypes.Number, required: true},
        manufacturer: {type: SchemaTypes.String, trim: true},
        receiptNumber: {type: SchemaTypes.String, trim: true},
        receipts: {
            type: [{type: SchemaTypes.ObjectId, ref: "Media"}],
            default: [],
            refAllowlist: MediaSimpleSnippet,
        },
        occurredAt: {type: SchemaTypes.Date},
        unitCost: {type: SchemaTypes.Number, min: 0},
        batchLot: {type: SchemaTypes.String, trim: true},
        expiryDate: {type: SchemaTypes.Date},
        performedBy: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        referenceType: {type: SchemaTypes.String},
        referenceId: {type: SchemaTypes.ObjectId},
        company: {type: SchemaTypes.ObjectId, ref: "Company", required: true, refAllowlist: CompanyBlankSnippet},
    },
    {
        accessMode: "loose",
        timestamps: {createdAt: true, updatedAt: false},
    },
);

applyInventoryMovementIndexes(InventoryMovementSchema);

const InventoryMovement = model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);
normalizeSchemaPermissions(InventoryMovement);
export default InventoryMovement;

addModelData(InventoryMovement, inventoryMovementViews);
