import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import CmsBlock, {ICmsBlock} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";

export class CmsBlockService extends BaseCrudService<ICmsBlock, typeof CmsBlock> {
    constructor() {
        super(CmsBlock, "CmsBlock");
    }
}

export const cmsBlockService = new CmsBlockService();
