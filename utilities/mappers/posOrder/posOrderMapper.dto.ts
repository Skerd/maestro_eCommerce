import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {PosOrder} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {
    mapPopulatedRef,
    mapPopulatedSimpleCurrency,
    mapPopulatedSimpleUser,
} from "@coreModule/utilities/mappers/common.mapper";

export function posOrderToDTO(order: IPosOrder): PosOrder {
    const tillCurrency = mapPopulatedSimpleCurrency((order.config as any)?.currency);

    return {
        _id: order._id.toString(),
        name: order.name,
        session: mapPopulatedRef(order.session),
        config: mapPopulatedRef(order.config),
        state: order.state,
        cashier: mapPopulatedSimpleUser(order.cashier),
        customer: mapPopulatedSimpleUser(order.customer),
        customerName: order.customerName,
        lines: order.lines?.map((line) => ({
            _id: line._id?.toString(),
            product: {
                _id: line.product?._id?.toString(),
                title: line.product?.title ?? line.productName,
                sku: line.product?.sku ?? line.productSku,
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
            currency: mapPopulatedSimpleCurrency(line.product?.currency),
        })) ?? [],
        payments: order.payments?.map((payment) => ({
            paymentMethod: {
                _id: payment.paymentMethod?._id?.toString(),
                name: payment.paymentMethod?.name ?? payment.paymentMethodName,
                type: payment.paymentMethod?.type ?? payment.paymentMethodType,
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
        productOrder: order.productOrder ? {
            _id: order.productOrder._id.toString(),
            orderNumber: order.productOrder.orderNumber,
        } : undefined,
        refundOf: mapPopulatedRef(order.refundOf),
        isRefund: order.isRefund,
        nslf: order.nslf,
        nivf: order.nivf,
        eic: order.eic,
        qrVerifyUrl: order.qrVerifyUrl,
        fiscalIssueDateTime: order.fiscalIssueDateTime,
        fiscalInvNum: order.fiscalInvNum,
        fiscalInvOrdNum: order.fiscalInvOrdNum,
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
