import {ObjectId} from "mongodb";
import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {PosOrder} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {PosConfigSimple} from "armonia/src/modules/eCommerce/dto/posConfig.dto";
import type {PosSessionSimple} from "armonia/src/modules/eCommerce/dto/posSession.dto";
import type {PosOrderSimple} from "armonia/src/modules/eCommerce/dto/posOrder.dto";
import type {PosPaymentMethodSimple} from "armonia/src/modules/eCommerce/dto/posPaymentMethod.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet, nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {PosSessionSimpleSnippet} from "@eCommerceModule/database/schemas/posSession/posSession.snippets";
import {PosOrderSimpleSnippet} from "@eCommerceModule/database/schemas/posOrder/posOrder.snippets";
import {PosPaymentMethodSimpleSnippet} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {currencyDecimalPlacesOf} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";

export function posOrderToDTO(order: IPosOrder): PosOrder {
    // The till and its session are populated on most reads; a held-cart list only has their ids.
    const config = order.config instanceof ObjectId ? undefined : order.config;
    const session = order.session instanceof ObjectId ? undefined : order.session;
    const tillCurrency = mapSnippet<CurrencySimple>()(config?.currency, CurrencySimpleSnippet);
    // Sales store their currency; older ones fall back to the till's.
    const saleCurrency = mapSnippet<CurrencySimple>()(order.currency, CurrencySimpleSnippet) ?? tillCurrency;

    return {
        _id: order._id.toString(),
        name: order.name,
        session: mapSnippet<PosSessionSimple>()(order.session, PosSessionSimpleSnippet)!,
        config: mapSnippet<PosConfigSimple>()(order.config, PosConfigSimpleSnippet)!,
        state: order.state,
        cashier: mapSnippet<SimpleBlankUser>()(order.cashier, SimpleBlankUserSnippet)!,
        customer: mapSnippet<SimpleBlankUser>()(order.customer, SimpleBlankUserSnippet),
        customerName: order.customerName,
        lines: order.lines?.map((line) => {
            const product = mapSnippet<ProductSimple>()(line.product, ProductSimpleSnippet);
            return {
                _id: line._id?.toString(),
                product: product
                    ? {
                        ...product,
                        title: product.title ?? line.productName,
                        sku: product.sku ?? line.productSku,
                    }
                    : {
                        _id: nestedEntityToRef(line.product)?.toString() ?? "",
                        title: line.productName,
                        slug: "",
                        sku: line.productSku,
                        status: "",
                        type: "",
                    },
                variant: nestedEntityToRef(line.variant)?.toString(),
                quantity: line.quantity,
                quantityRefunded: line.quantityRefunded,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: line.discountAmount,
                priceSubtotal: line.priceSubtotal,
                priceTotal: line.priceTotal,
                taxAmount: line.taxAmount,
                productName: line.productName ?? product?.title,
                productSku: line.productSku ?? product?.sku,
                barcode: line.barcode,
                // ProductSimpleSnippet already projects the product's currency through CurrencySimpleSnippet
                currency: product?.currency,
            };
        }) ?? [],
        payments: order.payments?.map((payment) => {
            const method = mapSnippet<PosPaymentMethodSimple>()(payment.paymentMethod, PosPaymentMethodSimpleSnippet);
            return {
                paymentMethod: method ?? {
                    _id: payment.paymentMethod?._id?.toString() ?? "",
                    name: payment.paymentMethodName ?? "",
                    type: payment.paymentMethodType ?? "",
                    isActive: true,
                    sequence: 0,
                },
                paymentMethodName: payment.paymentMethodName ?? method?.name,
                paymentMethodType: payment.paymentMethodType ?? method?.type,
                amount: payment.amount,
                currency: saleCurrency,
                paymentDate: payment.paymentDate?.toISOString?.(),
                terminalAuthCode: payment.terminalAuthCode,
                terminalReference: payment.terminalReference,
                terminalId: payment.terminalId,
            };
        }) ?? [],
        amountTax: order.amountTax,
        amountTotal: order.amountTotal,
        amountPaid: order.amountPaid,
        amountReturn: order.amountReturn,
        discountTotal: order.discountTotal,
        currency: saleCurrency,
        decimalPlaces: currencyDecimalPlacesOf(order.currency)
            ?? currencyDecimalPlacesOf(config?.currency)
            ?? currencyDecimalPlacesOf(session?.currency),
        amountRefunded: order.amountRefunded,
        note: order.note,
        orderDiscountPercent: order.orderDiscountPercent,
        clientRequestId: order.clientRequestId,
        productOrder: mapSnippet<ProductOrderSimple>()(order.productOrder, ProductOrderSimpleSnippet),
        refundOf: mapSnippet<PosOrderSimple>()(order.refundOf, PosOrderSimpleSnippet),
        isRefund: order.isRefund,
        nslf: order.nslf,
        nivf: order.nivf,
        eic: order.eic,
        qrVerifyUrl: order.qrVerifyUrl,
        fiscalIssueDateTime: order.fiscalIssueDateTime,
        fiscalInvNum: order.fiscalInvNum,
        fiscalInvOrdNum: order.fiscalInvOrdNum,
        fiscalTcrCode: order.fiscalTcrCode,
        fiscalOperatorCode: order.fiscalOperatorCode,
        fiscalBusinessUnitCode: order.fiscalBusinessUnitCode,
        fiscalTypeOfInv: order.fiscalTypeOfInv,
        fiscalConfig: order.fiscalConfig?._id?.toString(),
        fiscalizedAt: order.fiscalizedAt?.toISOString?.(),
        einvoiceAt: order.einvoiceAt?.toISOString?.(),
        fiscalError: order.fiscalError,
        // The marker is loaded only where the router asks for it (`extraDocumentSelect`); elsewhere it reads false
        fiscalAwaitingConfirmation: !!order.fiscalRegisteringAt && !order.nslf && !order.nivf,
        fiscalResolution: order.fiscalResolution,
        fiscalResolvedBy: mapSnippet<SimpleBlankUser>()(order.fiscalResolvedBy, SimpleBlankUserSnippet),
        fiscalResolvedAt: order.fiscalResolvedAt?.toISOString?.(),
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
        ...mapLifeCycleToDTO(order),
    };
}

export function posOrdersToDTO(orders: IPosOrder[]): PosOrder[] {
    return orders.map(posOrderToDTO);
}
