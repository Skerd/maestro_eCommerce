import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    PRODUCT_ATTRIBUTE_NAME_MAX,
    PRODUCT_ATTRIBUTE_VALUE_MAX,
    PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS,
    ProductAttributeSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import {applyProductAttributeIndexes} from "./productAttribute.indexes";
import {productAttributeViews} from "./productAttribute.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface IProductAttribute extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    values?: string[];
    isVisibleOnProductPage?: boolean;
    isUsedForVariants?: boolean;
    position?: number;
}

const ProductAttributeSchema = new Schema<IProductAttribute>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: PRODUCT_ATTRIBUTE_NAME_MAX,
        },
        values: {
            type: [{
                type: SchemaTypes.String,
                trim: true,
                maxlength: PRODUCT_ATTRIBUTE_VALUE_MAX,
            }],
            default: [],
            validate: {
                validator(value: string[]) {
                    return !value || value.length <= PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS;
                },
                message: `Cannot have more than ${PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS} values`,
            },
        },
        isVisibleOnProductPage: {
            type: SchemaTypes.Boolean,
            default: true
        },
        isUsedForVariants: {
            type: SchemaTypes.Boolean,
            default: false
        },
        position: {
            type: SchemaTypes.Number,
            default: 0
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(ProductAttributeSchema);
auditPlugin(ProductAttributeSchema);
softDeletePlugin(ProductAttributeSchema);
applyProductAttributeIndexes(ProductAttributeSchema);
lifeCyclePlugin(ProductAttributeSchema);
const ProductAttribute = model<IProductAttribute>("ProductAttribute", ProductAttributeSchema);
normalizeSchemaPermissions(ProductAttribute);
export default ProductAttribute;

addModelData(ProductAttribute, productAttributeViews);
validateSchemaDefAgainstMongoose(ProductAttributeSchema, ProductAttributeSchemaDef, "ProductAttribute");
