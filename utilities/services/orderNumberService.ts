import {ObjectId} from "mongodb";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";

export async function generateOrderNumber(companyId: ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    const last = await ProductOrder.findOne(
        {company: companyId, orderNumber: {$regex: `^${prefix}`}},
        {orderNumber: 1},
        {sort: {createdAt: -1}},
    ).lean();

    let sequence = 1;
    if (last?.orderNumber) {
        const parts = last.orderNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(6, "0")}`;
}
