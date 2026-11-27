import type {ObjectId} from "mongodb";
import {BaseCrudService, type CrudOptions} from "@coreModule/database/services/baseCrudService";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import ShopSettings, {type IShopSettings} from "./shopSettings";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";

export class ShopSettingsService extends BaseCrudService<IShopSettings, typeof ShopSettings> {
    constructor() {
        super(ShopSettings, "ShopSettings");
    }

    /** The shop's settings, or null when it never opened them. */
    async findForCompany(companyId: ObjectId, options: CrudOptions = {}): Promise<IShopSettings | null> {
        return this.findOne({company: companyId}, {...options, withDeleted: false});
    }

    /** The top-level platform categories the shop sells in; empty when it chose none (P26.8). */
    async branchesOf(companyId: ObjectId, options: CrudOptions = {}): Promise<ObjectId[]> {
        const settings = await this.findForCompany(companyId, options);
        return (settings?.branches ?? []).map((branch) => nestedEntityToRef(branch)).filter((branch): branch is ObjectId => !!branch);
    }

    /**
     * The shop's settings, created the first time staff open them, with What we sell set to the branches its products
     * already use (P26.8).
     */
    async getOrCreateForCompany(companyId: ObjectId, options: CrudOptions = {}): Promise<IShopSettings> {
        const existing = await this.findForCompany(companyId, options);
        if (existing) return existing;
        const used = await productService.usedCategoryIds({company: companyId});
        const branchById = new Map<string, ObjectId>();
        if (used.length) {
            for (const category of await categoryService.find({_id: {$in: used}}, options, undefined, "branch")) {
                if (category.branch) branchById.set(String(category.branch), category.branch);
            }
        }
        const branches = [...branchById.values()];
        try {
            return await this.create({company: companyId, branches}, options);
        } catch (err: unknown) {
            // Race: another request created the singleton — re-read.
            const raced = await this.findForCompany(companyId, options);
            if (raced) return raced;
            throw err;
        }
    }
}

export const shopSettingsService = new ShopSettingsService();
