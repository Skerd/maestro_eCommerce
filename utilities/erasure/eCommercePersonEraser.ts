import {
    ERASED_FIRST_NAME,
    ERASED_LAST_NAME,
    ERASED_TEXT,
    objectIds as ids,
    registerPersonEraser,
    type ErasureContext,
    type ErasureCount,
} from "@coreModule/utilities/erasure/personErasure";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import {customerAddressService} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.service";
import {savedSearchService} from "@eCommerceModule/database/schemas/savedSearch/savedSearch.service";
import {customerGroupMemberService} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.service";

/** An order's address without the person: name and street replaced, phone gone; town and country stay for tax. */
const anonymisedAddress = (path: string) => ({
    set: {[`${path}.firstName`]: ERASED_FIRST_NAME, [`${path}.lastName`]: ERASED_LAST_NAME, [`${path}.street`]: ERASED_TEXT},
    unset: {[`${path}.phone`]: "" as const},
});

/**
 * A shop's records of one person (D57): orders stay for accounting with an erased name, no email, phone or street
 * (town and country stay for tax); checkouts lose their addresses; carts, saved addresses, saved searches and group
 * memberships are deleted. Links to the person's login account that an order needs (its buyer) stay: the account
 * itself is removed by the separate account deletion.
 */
async function eraseECommercePerson(ctx: ErasureContext): Promise<ErasureCount[]> {
    const {companyId, subject, preview, session} = ctx;
    const found = {session, withDeleted: true};
    const byAccount = (field: string) => ({[field]: {$in: subject.accountIds}});

    const productOrders = await productOrderService.find({company: companyId, $or: [byAccount("customer"), {email: {$in: subject.emails}}]}, found, undefined, "_id billingAddress");
    const posOrders = await posOrderService.find({company: companyId, ...byAccount("customer")}, found, undefined, "_id");
    const orders = await orderService.find({company: companyId, ...byAccount("customer"), note: {$exists: true}}, found, undefined, "_id");
    const checkouts = await checkoutService.find({company: companyId, ...byAccount("user")}, found, undefined, "_id");
    const carts = await cartService.find({company: companyId, ...byAccount("user")}, found, undefined, "_id");
    const addresses = await customerAddressService.find({company: companyId, $or: [byAccount("customer"), {email: {$in: subject.emails}}]}, found, undefined, "_id");
    const searches = await savedSearchService.find({company: companyId, ...byAccount("customer")}, found, undefined, "_id");
    const memberships = await customerGroupMemberService.find({company: companyId, ...byAccount("user")}, found, undefined, "_id");

    const counts: ErasureCount[] = [
        {collection: "productorders", anonymised: productOrders.length, deleted: 0},
        {collection: "posorders", anonymised: posOrders.length, deleted: 0},
        {collection: "orders", anonymised: orders.length, deleted: 0},
        {collection: "checkouts", anonymised: checkouts.length, deleted: 0},
        {collection: "carts", anonymised: 0, deleted: carts.length},
        {collection: "customeraddresses", anonymised: 0, deleted: addresses.length},
        {collection: "savedsearches", anonymised: 0, deleted: searches.length},
        {collection: "customergroupmembers", anonymised: 0, deleted: memberships.length},
    ];
    if (preview) return counts;

    if (productOrders.length > 0) {
        const shipping = anonymisedAddress("shippingAddress");
        await productOrderService.eraseFields({company: companyId, _id: {$in: ids(productOrders)}}, {
            $set: shipping.set,
            $unset: {...shipping.unset, email: "", phone: "", notes: ""},
        }, {session});
        const withBilling = ids(productOrders.filter((order) => order.billingAddress));
        if (withBilling.length > 0) {
            const billing = anonymisedAddress("billingAddress");
            await productOrderService.eraseFields({company: companyId, _id: {$in: withBilling}}, {$set: billing.set, $unset: billing.unset}, {session});
        }
        ctx.scrubAudit("productorders", ids(productOrders), ["shippingAddress", "billingAddress", "email", "phone", "notes"]);
    }
    if (posOrders.length > 0) {
        await posOrderService.eraseFields({company: companyId, _id: {$in: ids(posOrders)}}, {$unset: {customer: "", customerName: ""}}, {session});
        ctx.scrubAudit("posorders", ids(posOrders), ["customer", "customerName"]);
    }
    if (orders.length > 0) {
        await orderService.eraseFields({company: companyId, _id: {$in: ids(orders)}}, {$unset: {note: ""}}, {session});
        ctx.scrubAudit("orders", ids(orders), ["note"]);
    }
    if (checkouts.length > 0) {
        await checkoutService.eraseFields({company: companyId, _id: {$in: ids(checkouts)}}, {$unset: {user: "", shippingAddress: "", billingAddress: ""}}, {session});
        ctx.scrubAudit("checkouts", ids(checkouts), ["user", "shippingAddress", "billingAddress"]);
    }
    if (carts.length > 0) {
        await cartService.deleteMany({company: companyId, _id: {$in: ids(carts)}}, {session, hard: true});
        ctx.scrubAudit("carts", ids(carts), "all");
    }
    if (addresses.length > 0) {
        await customerAddressService.deleteMany({company: companyId, _id: {$in: ids(addresses)}}, {session, hard: true});
        ctx.scrubAudit("customeraddresses", ids(addresses), "all");
    }
    if (searches.length > 0) {
        await savedSearchService.deleteMany({company: companyId, _id: {$in: ids(searches)}}, {session, hard: true});
        ctx.scrubAudit("savedsearches", ids(searches), "all");
    }
    if (memberships.length > 0) {
        await customerGroupMemberService.deleteMany({company: companyId, _id: {$in: ids(memberships)}}, {session, hard: true});
        ctx.scrubAudit("customergroupmembers", ids(memberships), "all");
    }
    return counts;
}

export function registerECommercePersonErasers(): void {
    registerPersonEraser({module: "eCommerce", erase: eraseECommercePerson});
}
