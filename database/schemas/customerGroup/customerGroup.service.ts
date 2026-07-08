import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import CustomerGroup, {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";

export class CustomerGroupService extends BaseCrudService<ICustomerGroup, typeof CustomerGroup> {
    constructor() {
        super(CustomerGroup, "CustomerGroup");
    }
}

export const customerGroupService = new CustomerGroupService();
