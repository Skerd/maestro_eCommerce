import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PricingRuleSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.schema-def";
import PricingRule from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import {pricingRuleService} from "@eCommerceModule/database/schemas/pricingRule/pricingRule.service";
import {PricingRuleActions} from "@eCommerceModule/database/schemas/pricingRule/pricingRule.actions";
import {
    pricingRuleToDTO,
    pricingRulesToDTO,
    pricingRuleToDTOWithLabels,
    pricingRulesToDTOWithLabels,
} from "@eCommerceModule/utilities/mappers/pricingRule/pricingRuleMapper.dto";
import {pricingRulesToSelect} from "@eCommerceModule/utilities/mappers/pricingRule/pricingRuleMapper.select";
import {createPricingRuleFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/createPricingRule.form.validator";
import {editPricingRuleFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/editPricingRule.form.validator";

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
    toDTOArray: pricingRulesToDTO,
    toSelect: pricingRulesToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(PricingRuleSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(PricingRuleSchemaDef),
    actions: PricingRuleActions,
    rateLimits: {read: 60, write: 30, delete: 20},
    enrichList: pricingRulesToDTOWithLabels,
    enrichSingle: pricingRuleToDTOWithLabels,
    enrichUpdate: pricingRuleToDTOWithLabels,
});
