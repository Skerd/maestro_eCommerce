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
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {PosSessionSimpleSnippet} from "@eCommerceModule/database/schemas/posSession/posSession.snippets";
import {PosOrderSimpleSnippet} from "@eCommerceModule/database/schemas/posOrder/posOrder.snippets";
import {PosPaymentMethodSimpleSnippet} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";

export function posOrderToDTO(order: IPosOrder): PosOrder {
    const config = order.config as {currency?: object} | undefined;
    const tillCurrency = mapSnippet<CurrencySimple>()(config?.currency, CurrencySimpleSnippet);

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
                        _id: line.product?._id?.toString() ?? "",
                        title: line.productName,
                        slug: "",
                        sku: line.productSku,
                        status: "",
                        type: "",
                    },
                variant: line.variant?._id?.toString(),
                quantity: line.quantity,
                quantityRefunded: line.quantityRefunded,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: line.discountAmount,
                priceSubtotal: line.priceSubtotal,
                priceTotal: line.priceTotal,
                taxAmount: line.taxAmount,
                productName: line.productName ?? line.product?.title,
                productSku: line.productSku ?? line.product?.sku,
                barcode: line.barcode,
                currency: mapSnippet<CurrencySimple>()(
                    (line.product as {currency?: object} | undefined)?.currency,
                    CurrencySimpleSnippet,
                ),
            };
        }) ?? [],
        payments: order.payments?.map((payment) => ({
            paymentMethod: mapSnippet<PosPaymentMethodSimple>()(payment.paymentMethod, PosPaymentMethodSimpleSnippet)
                ?? {
                    _id: payment.paymentMethod?._id?.toString() ?? "",
                    name: payment.paymentMethodName ?? "",
                    type: payment.paymentMethodType ?? "",
                    isActive: true,
                    sequence: 0,
                },
            paymentMethodName: payment.paymentMethodName ?? payment.paymentMethod?.name,
            paymentMethodType: payment.paymentMethodType ?? payment.paymentMethod?.type,
            amount: payment.amount,
            currency: tillCurrency,
            paymentDate: payment.paymentDate?.toISOString?.(),
            terminalAuthCode: payment.terminalAuthCode,
            terminalReference: payment.terminalReference,
            terminalId: payment.terminalId,
        })) ?? [],
        amountTax: order.amountTax,
        amountTotal: order.amountTotal,
        amountPaid: order.amountPaid,
        amountReturn: order.amountReturn,
        discountTotal: order.discountTotal,
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
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
        ...mapLifeCycleToDTO(order),
    };
}

export function posOrdersToDTO(orders: IPosOrder[]): PosOrder[] {
    return orders.map(posOrderToDTO);
}
