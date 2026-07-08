import {ObjectId} from "mongodb";
import type {CollectionRuleCondition} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";

export type CollectionRule = {
    field: string;
    operator: string;
    value: string;
};

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRuleClause(rule: CollectionRule): Record<string, unknown> | null {
    const {field, operator, value} = rule;
    if (!field || !operator || value === undefined || value === "") return null;

    switch (field) {
        case "tag": {
            switch (operator) {
                case "equals":
                case "contains":
                    return {tags: value};
                case "not_equals":
                case "not_contains":
                    return {tags: {$nin: [value]}};
                case "starts_with":
                    return {tags: {$elemMatch: {$regex: `^${escapeRegex(value)}`, $options: "i"}}};
                default:
                    return null;
            }
        }
        case "category": {
            let categoryId: ObjectId;
            try {
                categoryId = new ObjectId(String(value));
            } catch {
                return null;
            }
            switch (operator) {
                case "equals":
                case "contains":
                    return {categories: categoryId};
                case "not_equals":
                case "not_contains":
                    return {categories: {$nin: [categoryId]}};
                default:
                    return null;
            }
        }
        case "brand":
        case "vendor": {
            const path = field;
            switch (operator) {
                case "equals":
                    return {[path]: value};
                case "not_equals":
                    return {[path]: {$ne: value}};
                case "contains":
                    return {[path]: {$regex: escapeRegex(value), $options: "i"}};
                case "not_contains":
                    return {[path]: {$not: {$regex: escapeRegex(value), $options: "i"}}};
                case "starts_with":
                    return {[path]: {$regex: `^${escapeRegex(value)}`, $options: "i"}};
                default:
                    return null;
            }
        }
        case "product_type": {
            switch (operator) {
                case "equals":
                    return {type: value};
                case "not_equals":
                    return {type: {$ne: value}};
                case "contains":
                    return {type: {$regex: escapeRegex(value), $options: "i"}};
                case "not_contains":
                    return {type: {$not: {$regex: escapeRegex(value), $options: "i"}}};
                case "starts_with":
                    return {type: {$regex: `^${escapeRegex(value)}`, $options: "i"}};
                default:
                    return null;
            }
        }
        case "price": {
            const num = Number(value);
            if (Number.isNaN(num)) return null;
            switch (operator) {
                case "equals":
                    return {price: num};
                case "not_equals":
                    return {price: {$ne: num}};
                case "greater_than":
                    return {price: {$gt: num}};
                case "less_than":
                    return {price: {$lt: num}};
                default:
                    return null;
            }
        }
        case "inventory_level":
            // Deferred: no queryable stock aggregate on Product yet.
            return null;
        default:
            return null;
    }
}

/**
 * Builds a MongoDB filter for active products matching collection dynamic rules.
 */
export function buildProductFilterFromCollectionRules(
    companyId: ObjectId | string,
    rules: CollectionRule[],
    ruleCondition: CollectionRuleCondition = "all",
): Record<string, unknown> {
    const base: Record<string, unknown> = {
        company: typeof companyId === "string" ? new ObjectId(companyId) : companyId,
        status: "active",
        deletedAt: null,
    };

    const clauses = (rules ?? [])
        .map(buildRuleClause)
        .filter((c): c is Record<string, unknown> => c !== null);

    if (clauses.length === 0) return base;
    if (clauses.length === 1) return {...base, ...clauses[0]};

    if (ruleCondition === "any") {
        return {...base, $or: clauses};
    }
    return {...base, $and: clauses};
}
