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
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    INVENTORY_MOVEMENT_NOTE_MAX,
    INVENTORY_MOVEMENT_TEXT_MAX,
    InventoryMovementSchemaDef,
    inventoryMovementReasons,
    type InventoryMovementReason,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.schema-def";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {applyInventoryMovementIndexes} from "./inventoryMovement.indexes";
import {inventoryMovementViews} from "./inventoryMovement.views";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type {InventoryMovementReason};

/**
 * Stock ledger row — system/action-generated only. Panel is read-only
 * (list + single); all fields are write-locked (NoWritePermission).
 */
export interface IInventoryMovement extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
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
            dynamicTableConfiguration: {visible: false, refDisplayKey: ["quantityOnHand"]},
        },
        product: {
            type: SchemaTypes.ObjectId,
            ref: "Product",
            required: true,
            refAllowlist: ProductSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {refDisplayKey: ["title"]},
        },
        variant: {
            type: SchemaTypes.ObjectId,
            ref: "ProductVariant",
            refAllowlist: ProductVariantSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {refDisplayKey: ["sku"]},
        },
        warehouse: {
            type: SchemaTypes.ObjectId,
            ref: "Warehouse",
            required: true,
            refAllowlist: WarehouseSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {refDisplayKey: ["name"]},
        },
        quantity: {
            type: SchemaTypes.Number,
            required: true,
            permissions: NoWritePermission,
        },
        reason: {
            type: SchemaTypes.String,
            enum: [...inventoryMovementReasons],
            required: true,
            permissions: NoWritePermission,
        },
        note: {
            type: SchemaTypes.String,
            maxlength: INVENTORY_MOVEMENT_NOTE_MAX,
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
            maxlength: INVENTORY_MOVEMENT_TEXT_MAX,
            permissions: NoWritePermission,
        },
        receiptNumber: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: INVENTORY_MOVEMENT_TEXT_MAX,
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
            maxlength: INVENTORY_MOVEMENT_TEXT_MAX,
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
            dynamicTableConfiguration: {refDisplayKey: ["name", "surname"]},
        },
        referenceType: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {visible: false},
        },
        referenceId: {
            type: SchemaTypes.ObjectId,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {visible: false},
        }
    },
    {
        accessMode: "loose",
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
auditPlugin(InventoryMovementSchema);
softDeletePlugin(InventoryMovementSchema);
applyInventoryMovementIndexes(InventoryMovementSchema);
lifeCyclePlugin(InventoryMovementSchema);
const InventoryMovement = model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);
normalizeSchemaPermissions(InventoryMovement);
export default InventoryMovement;

addModelData(InventoryMovement, inventoryMovementViews);
validateSchemaDefAgainstMongoose(InventoryMovementSchema, InventoryMovementSchemaDef, "InventoryMovement");
