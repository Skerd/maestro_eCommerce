import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {CitySimpleSnippet} from "@coreModule/database/schemas/city/city.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {WarehouseSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.schema-def";
import {applyWarehouseIndexes} from "./warehouse.indexes";
import {warehouseViews} from "./warehouse.views";

export interface IWarehouse extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    code: string;
    address?: {
        country?: Schema.Types.ObjectId;
        state?: Schema.Types.ObjectId;
        city?: Schema.Types.ObjectId;
        street?: string;
        postalCode?: string;
    };
    isDefault?: boolean;
    isActive?: boolean;
    company: ICompany;
}

const WarehouseSchema = new Schema<IWarehouse>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        code: {type: SchemaTypes.String, required: true, trim: true, uppercase: true},
        address: {
            type: {
                country: {type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet},
                state: {type: SchemaTypes.ObjectId, ref: "State", refAllowlist: StateSimpleSnippet},
                city: {type: SchemaTypes.ObjectId, ref: "City", refAllowlist: CitySimpleSnippet},
                street: {type: SchemaTypes.String},
                postalCode: {type: SchemaTypes.String},
            },
            required: false,
        },
        isDefault: {type: SchemaTypes.Boolean, default: false},
        isActive: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(WarehouseSchema);
auditPlugin(WarehouseSchema);
softDeletePlugin(WarehouseSchema);
applyWarehouseIndexes(WarehouseSchema);
const Warehouse = model<IWarehouse>("Warehouse", WarehouseSchema);
normalizeSchemaPermissions(Warehouse);
export default Warehouse;

addModelData(Warehouse, warehouseViews);
validateSchemaDefAgainstMongoose(WarehouseSchema, WarehouseSchemaDef, "Warehouse");
