import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {PosOrder, PosOrderLineProduct} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapUserLabel(user: any): {_id: string; name?: string; surname?: string} | undefined {
    if (!user) return undefined;
    return {
        _id: user._id?.toString?.() ?? user.toString?.() ?? "",
        name: user.name,
        surname: user.surname,
    };
}

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

function mapLineProduct(line: any): PosOrderLineProduct {
    const product = line.product;
    const id =
        product?._id?.toString?.() ??
        product?.toString?.() ??
        "";
    return {
        _id: id,
        title: product?.title ?? line.productName ?? "",
        sku: product?.sku ?? line.productSku,
    };
}

export function posOrderToDTO(order: IPosOrder): PosOrder {
    const session = order.session as any;
    const config = order.config as any;
    const cashier = mapUserLabel(order.cashier) ?? {_id: ""};
    const productOrderRaw = order.productOrder as any;
    const refundOfRaw = order.refundOf as any;

    const lines = ((order.lines as any[]) ?? []).map(line => {
        const product = mapLineProduct(line);
        return {
            _id: line._id?.toString?.(),
            product,
            variant: line.variant ? line.variant._id?.toString?.() ?? line.variant.toString?.() : undefined,
            quantity: line.quantity,
            quantityRefunded: Number(line.quantityRefunded ?? 0),
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            discountAmount: line.discountAmount ?? 0,
            priceSubtotal: line.priceSubtotal,
            priceTotal: line.priceTotal,
            taxAmount: line.taxAmount ?? 0,
            productName: line.productName ?? product.title ?? "",
            productSku: line.productSku ?? product.sku,
            barcode: line.barcode,
        };
    });

    const lineProducts = lines
        .map(line => (typeof line.product === "object" ? line.product : null))
        .filter((p): p is PosOrderLineProduct => !!p && typeof p._id === "string" && p._id.length > 0)
        .filter((p, index, arr) => arr.findIndex(x => x._id === p._id) === index);

    const payments = ((order.payments as any[]) ?? []).map(payment => {
        const method = payment.paymentMethod;
        const methodObj =
            method?._id
                ? {_id: method._id.toString(), name: method.name ?? payment.paymentMethodName ?? "", type: method.type ?? payment.paymentMethodType}
                : payment.paymentMethodName
                  ? {
                        _id: method?.toString?.() ?? "",
                        name: payment.paymentMethodName,
                        type: payment.paymentMethodType,
                    }
                  : method
                    ? {_id: method.toString?.() ?? String(method), name: payment.paymentMethodName}
                    : {_id: ""};
        return {
            paymentMethod: methodObj,
            paymentMethodLabel: methodObj._id
                ? {_id: methodObj._id, name: methodObj.name ?? "", type: methodObj.type}
                : undefined,
            paymentMethodName: payment.paymentMethodName ?? methodObj.name,
            paymentMethodType: payment.paymentMethodType ?? methodObj.type,
            amount: payment.amount,
            paymentDate:
                payment.paymentDate instanceof Date
                    ? payment.paymentDate.toISOString()
                    : payment.paymentDate,
            terminalAuthCode: payment.terminalAuthCode,
            terminalReference: payment.terminalReference,
            terminalId: payment.terminalId,
        };
    });

    return {
        _id: order._id.toString(),
        name: order.name,
        session: session?._id?.toString?.() ?? session?.toString?.() ?? "",
        sessionLabel: session?._id ? {_id: session._id.toString(), name: session.name ?? ""} : undefined,
        config: config?._id?.toString?.() ?? config?.toString?.() ?? "",
        configLabel: config?._id ? {_id: config._id.toString(), name: config.name ?? ""} : undefined,
        state: order.state,
        cashier,
        customer: mapUserLabel(order.customer),
        customerName: order.customerName,
        lines,
        lineProducts,
        payments,
        amountTax: order.amountTax,
        amountTotal: order.amountTotal,
        amountPaid: order.amountPaid,
        amountReturn: order.amountReturn,
        discountTotal: order.discountTotal,
        amountRefunded: Number((order as any).amountRefunded ?? 0),
        note: order.note,
        orderDiscountPercent: (order as any).orderDiscountPercent ?? 0,
        clientRequestId: (order as any).clientRequestId,
        productOrder: productOrderRaw?._id?.toString?.() ?? productOrderRaw?.toString?.(),
        productOrderLabel: productOrderRaw?._id
            ? {_id: productOrderRaw._id.toString(), orderNumber: productOrderRaw.orderNumber}
            : productOrderRaw
              ? {_id: productOrderRaw.toString?.() ?? String(productOrderRaw)}
              : undefined,
        refundOf: refundOfRaw?._id?.toString?.() ?? refundOfRaw?.toString?.(),
        refundOfLabel: refundOfRaw?._id
            ? {_id: refundOfRaw._id.toString(), name: refundOfRaw.name}
            : refundOfRaw
              ? {_id: refundOfRaw.toString?.() ?? String(refundOfRaw)}
              : undefined,
        isRefund: order.isRefund,
        nslf: (order as any).nslf,
        nivf: (order as any).nivf,
        eic: (order as any).eic,
        qrVerifyUrl: (order as any).qrVerifyUrl,
        fiscalIssueDateTime: (order as any).fiscalIssueDateTime,
        fiscalInvNum: (order as any).fiscalInvNum,
        fiscalInvOrdNum: (order as any).fiscalInvOrdNum,
        fiscalConfig: (order as any).fiscalConfig?.toString?.(),
        fiscalizedAt:
            (order as any).fiscalizedAt instanceof Date
                ? (order as any).fiscalizedAt.toISOString()
                : (order as any).fiscalizedAt,
        einvoiceAt:
            (order as any).einvoiceAt instanceof Date
                ? (order as any).einvoiceAt.toISOString()
                : (order as any).einvoiceAt,
        fiscalError: (order as any).fiscalError,
        company: mapCompanyLabel(order.company),
        createdAt:
            (order as any).createdAt instanceof Date
                ? (order as any).createdAt.toISOString()
                : (order as any).createdAt,
        updatedAt:
            (order as any).updatedAt instanceof Date
                ? (order as any).updatedAt.toISOString()
                : (order as any).updatedAt,
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
    };
}

export function posOrdersToDTO(orders: IPosOrder[]): PosOrder[] {
    return orders.map(posOrderToDTO);
}

export function posOrderToSelect(order: IPosOrder): ApiSelectDatum {
    return {value: order._id.toString(), label: order.name};
}

export function posOrdersToSelect(orders: IPosOrder[]): ApiSelectDatum[] {
    return orders.map(posOrderToSelect);
}
