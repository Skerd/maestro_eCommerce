import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PricingRuleSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.schema-def";
import PricingRule from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import {pricingRuleService} from "@eCommerceModule/database/schemas/pricingRule/pricingRule.service";
import {PricingRuleActions} from "@eCommerceModule/database/schemas/pricingRule/pricingRule.actions";
import {
    pricingRuleToDTO,
    pricingRuleToDTOWithLabels,
    pricingRulesToDTOWithLabels,
} from "@eCommerceModule/utilities/mappers/pricingRule/pricingRuleMapper.dto";
import {pricingRulesToSelect} from "@eCommerceModule/utilities/mappers/pricingRule/pricingRuleMapper.select";
import {createPricingRuleFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/createPricingRule.form.validator";
import {editPricingRuleFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/editPricingRule.form.validator";

const buildPricingRuleCreateFromSchemaDef = buildCreateDataFromSchemaDef(PricingRuleSchemaDef);
const buildPricingRuleUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(PricingRuleSchemaDef);

export const basePath = "/api/eCommerce/pricingRule";
export const {router} = createCrudRouter({
    collectionName: "pricingRules",
    model: PricingRule,
    service: pricingRuleService,
    entityName: "PricingRule",
    selectSearchField: "name",
    defaultSort: {priority: -1},
    createSchema: createPricingRuleFormSchema,
    editSchema: editPricingRuleFormSchema,
    toDTO: pricingRuleToDTO,
    toDTOArray: (docs) => docs.map((d) => pricingRuleToDTO(d)),
    toSelect: pricingRulesToSelect,
    buildCreateData: async (params) => {
        const data = buildPricingRuleCreateFromSchemaDef(params);
        if (data.isActive === undefined) data.isActive = true;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildPricingRuleUpdateFromSchemaDef(params, writeFields);
        // Active state is managed via activate/deactivate actions, not the edit form.
        delete data.isActive;
        return data;
    },
    actions: PricingRuleActions,
    rateLimits: {read: 60, write: 30, delete: 20},
    enrichList: async (docs) => pricingRulesToDTOWithLabels(docs),
    enrichSingle: async (doc) => pricingRuleToDTOWithLabels(doc),
    enrichUpdate: async (doc) => pricingRuleToDTOWithLabels(doc),
});
