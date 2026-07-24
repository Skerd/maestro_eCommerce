import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {PosOrder} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/posOrder.dto";
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

export function posOrderToDTO(order: IPosOrder): PosOrder {
    const session = order.session as any;
    const config = order.config as any;
    const cashier = mapUserLabel(order.cashier) ?? {_id: ""};

    const lines = ((order.lines as any[]) ?? []).map(line => ({
        _id: line._id?.toString?.(),
        product: line.product?._id?.toString?.() ?? line.product?.toString?.() ?? "",
        variant: line.variant ? line.variant._id?.toString?.() ?? line.variant.toString?.() : undefined,
        quantity: line.quantity,
        quantityRefunded: Number(line.quantityRefunded ?? 0),
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent ?? 0,
        discountAmount: line.discountAmount ?? 0,
        priceSubtotal: line.priceSubtotal,
        priceTotal: line.priceTotal,
        taxAmount: line.taxAmount ?? 0,
        productName: line.productName ?? "",
        productSku: line.productSku,
        barcode: line.barcode,
    }));

    const payments = ((order.payments as any[]) ?? []).map(payment => {
        const method = payment.paymentMethod;
        return {
            paymentMethod: method?._id?.toString?.() ?? method?.toString?.() ?? "",
            paymentMethodLabel: method?._id
                ? {_id: method._id.toString(), name: method.name ?? "", type: method.type}
                : payment.paymentMethodName
                  ? {
                        _id: method?.toString?.() ?? "",
                        name: payment.paymentMethodName,
                        type: payment.paymentMethodType,
                    }
                  : undefined,
            paymentMethodName: payment.paymentMethodName ?? method?.name,
            paymentMethodType: payment.paymentMethodType ?? method?.type,
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
        productOrder: order.productOrder?.toString?.(),
        refundOf: order.refundOf?.toString?.(),
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
