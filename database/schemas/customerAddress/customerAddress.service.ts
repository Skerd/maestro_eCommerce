import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import CustomerAddress, {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";

export class CustomerAddressService extends BaseCrudService<ICustomerAddress, typeof CustomerAddress> {
    constructor() {
        super(CustomerAddress, "CustomerAddress");
    }
}

export const customerAddressService = new CustomerAddressService();
