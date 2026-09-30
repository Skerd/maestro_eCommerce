import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {addModelData} from "@coreModule/database/collections";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {applyInventoryMovementIndexes} from "./inventoryMovement.indexes";
import {inventoryMovementViews} from "./inventoryMovement.views";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields} from "@coreModule/database/types/plugin-fields";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

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

/**
 * Stock ledger row — system/action-generated only. Panel is read-only
 * (list + single); all fields are write-locked (NoWritePermission).
 */
export interface IInventoryMovement extends Document, IOwnershipPluginFields, ILifeCyclePluginFields {
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
    /** Opaque polymorphic link with `referenceType` — intentionally no Interface / mongoose ref. */
    referenceId?: Types.ObjectId;
    company: ICompany;
    createdAt?: Date;
}

const NoWritePermission = {
    self: {
        write: "no-permission",
    },
    others: {
        write: "no-permission",
    },
};

const InventoryMovementSchema = new Schema<IInventoryMovement>(
    {
        inventory: {
            type: SchemaTypes.ObjectId,
            ref: "Inventory",
            refAllowlist: InventorySimpleSnippet,
            permissions: NoWritePermission,
        },
        product: {
            type: SchemaTypes.ObjectId,
            ref: "Product",
            required: true,
            refAllowlist: ProductSimpleSnippet,
            permissions: NoWritePermission,
        },
        variant: {
            type: SchemaTypes.ObjectId,
            ref: "ProductVariant",
            refAllowlist: ProductVariantSimpleSnippet,
            permissions: NoWritePermission,
        },
        warehouse: {
            type: SchemaTypes.ObjectId,
            ref: "Warehouse",
            required: true,
            refAllowlist: WarehouseSimpleSnippet,
            permissions: NoWritePermission,
        },
        quantity: {
            type: SchemaTypes.Number,
            required: true,
            permissions: NoWritePermission,
        },
        reason: {
            type: SchemaTypes.String,
            enum: ["restock", "sale", "return", "adjustment", "damage", "transfer_in", "transfer_out", "initial", "write_off"],
            required: true,
            permissions: NoWritePermission,
        },
        note: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        quantityBefore: {
            type: SchemaTypes.Number,
            required: true,
            permissions: NoWritePermission,
        },
        quantityAfter: {
            type: SchemaTypes.Number,
            required: true,
            permissions: NoWritePermission,
        },
        manufacturer: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        receiptNumber: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        receipts: {
            type: [{type: SchemaTypes.ObjectId, ref: "Media"}],
            default: [],
            refAllowlist: MediaSimpleSnippet,
            permissions: NoWritePermission,
        },
        occurredAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        unitCost: {
            type: SchemaTypes.Number,
            min: 0,
            permissions: NoWritePermission,
        },
        batchLot: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission,
        },
        expiryDate: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
        },
        performedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
        },
        referenceType: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
        },
        referenceId: {
            type: SchemaTypes.ObjectId,
            permissions: NoWritePermission,
        }
    },
    {
        accessMode: "loose",
        timestamps: {createdAt: true, updatedAt: false},
        permissions: {
            self: {
                create: "no-permission",
                delete: "no-permission",
                restore: "no-permission",
            },
            others: {
                create: "no-permission",
                delete: "no-permission",
                restore: "no-permission",
            },
        },
    },
);

ownershipPlugin(InventoryMovementSchema);
lifeCyclePlugin(InventoryMovementSchema);
applyInventoryMovementIndexes(InventoryMovementSchema);
const InventoryMovement = model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);
normalizeSchemaPermissions(InventoryMovement);
export default InventoryMovement;

addModelData(InventoryMovement, inventoryMovementViews);
