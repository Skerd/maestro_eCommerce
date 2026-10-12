import type {IStockCount} from "@eCommerceModule/database/schemas/stockCount/stockCount";
import type {StockCount} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/stockCount.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {WarehouseSimple} from "armonia/src/modules/eCommerce/dto/warehouse.dto";
import {dateToISOString, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function stockCountToDTO(count: IStockCount): StockCount {
    return {
        _id: count._id.toString(),
        warehouse: mapSnippet<WarehouseSimple>()(count.warehouse, WarehouseSimpleSnippet)!,
        lines: (count.lines ?? []).map(line => ({
            product: mapSnippet<ProductSimple>()(line.product, ProductSimpleSnippet)!,
            variant: mapSnippet<ProductVariantSimple>()(line.variant, ProductVariantSimpleSnippet),
            expectedQuantity: line.expectedQuantity,
            countedQuantity: line.countedQuantity,
        })),
        status: count.status,
        note: count.note,
        appliedBy: mapSnippet<SimpleBlankUser>()(count.appliedBy, SimpleBlankUserSnippet),
        appliedAt: dateToISOString(count.appliedAt) || undefined,
        ...mapSoftDeleteToDTO(count),
        ...mapOwnershipToDTO(count),
        ...mapLifeCycleToDTO(count),
    };
}

export function stockCountsToDTO(counts: IStockCount[]): StockCount[] {
    return counts.map(stockCountToDTO);
}
