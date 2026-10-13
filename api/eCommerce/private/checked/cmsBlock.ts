import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CmsBlockSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.schema-def";
import {createCmsBlockFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/createCmsBlock.form.validator";
import {editCmsBlockFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/editCmsBlock.form.validator";
import CmsBlock from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import {cmsBlockService} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock.service";
import {cmsBlockToDTO, cmsBlocksToDTO} from "@eCommerceModule/utilities/mappers/cmsBlock/cmsBlockMapper.dto";
import {cmsBlocksToSelect} from "@eCommerceModule/utilities/mappers/cmsBlock/cmsBlockMapper.select";
import {CmsBlockActions} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock.actions";

export const basePath = "/api/eCommerce/cmsBlock";
export const {router} = createCrudRouter({
    collectionName: "cmsBlocks",
    model: CmsBlock,
    service: cmsBlockService,
    entityName: "CmsBlock",
    selectSearchField: "title",
    defaultSort: {createdAt: -1},
    createSchema: createCmsBlockFormSchema,
    editSchema: editCmsBlockFormSchema,
    toDTO: cmsBlockToDTO,
    toDTOArray: cmsBlocksToDTO,
    toSelect: cmsBlocksToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(CmsBlockSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(CmsBlockSchemaDef),
    actions: CmsBlockActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
