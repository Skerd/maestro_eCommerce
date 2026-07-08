import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import CustomerGroupMember, {ICustomerGroupMember} from "./customerGroupMember";

export class CustomerGroupMemberService extends BaseCrudService<ICustomerGroupMember, typeof CustomerGroupMember> {
    constructor() {
        super(CustomerGroupMember, "CustomerGroupMember");
    }
}

export const customerGroupMemberService = new CustomerGroupMemberService();
