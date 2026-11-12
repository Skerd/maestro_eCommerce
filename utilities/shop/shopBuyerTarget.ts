import {ObjectId} from "mongodb";
import type {PortalBuyerTarget} from "@coreModule/utilities/security/portalBuyer";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {portalCompanyClause} from "@coreModule/utilities/marketing/portalCompanies";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";

const REASON = "the module gate names a shop seller for a portal buyer's cart or order";

/**
 * The company a portal buyer's shop route answers the module gate with (D143, TD-B189): the seller of the product the
 * request names, else any company the portal may buy from (the cart and checkout span sellers, and the routes
 * themselves keep to those sellers). Nothing when no company sells on the portal, so the route is refused.
 */
export const shopSeller: PortalBuyerTarget = ({body}) => asCrossTenant(REASON, async () => {
    const productId = typeof body.productId === "string" && ObjectId.isValid(body.productId) ? new ObjectId(body.productId) : undefined;
    if (productId) {
        const product = await productService.findById(productId, {}, null, "company");
        return product ? nestedEntityToRef(product.company) : undefined;
    }
    const seller = await companyService.findOne(portalCompanyClause("eCommerce"), {withDeleted: false}, undefined, "_id");
    return seller?._id;
});
