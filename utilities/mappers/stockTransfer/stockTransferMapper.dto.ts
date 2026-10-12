import type {IStockTransfer} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import type {StockTransfer} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.dto";
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

export function stockTransferToDTO(transfer: IStockTransfer): StockTransfer {
    return {
        _id: transfer._id.toString(),
        fromWarehouse: mapSnippet<WarehouseSimple>()(transfer.fromWarehouse, WarehouseSimpleSnippet)!,
        toWarehouse: mapSnippet<WarehouseSimple>()(transfer.toWarehouse, WarehouseSimpleSnippet)!,
        lines: (transfer.lines ?? []).map(line => ({
            product: mapSnippet<ProductSimple>()(line.product, ProductSimpleSnippet)!,
            variant: mapSnippet<ProductVariantSimple>()(line.variant, ProductVariantSimpleSnippet),
            quantity: line.quantity,
        })),
        status: transfer.status,
        note: transfer.note,
        doneBy: mapSnippet<SimpleBlankUser>()(transfer.doneBy, SimpleBlankUserSnippet),
        doneAt: dateToISOString(transfer.doneAt) || undefined,
        ...mapSoftDeleteToDTO(transfer),
        ...mapOwnershipToDTO(transfer),
        ...mapLifeCycleToDTO(transfer),
    };
}

export function stockTransfersToDTO(transfers: IStockTransfer[]): StockTransfer[] {
    return transfers.map(stockTransferToDTO);
}
