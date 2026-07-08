import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CmsBlockSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.schema-def";
import {createCmsBlockFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/createCmsBlock.form.validator";
import {editCmsBlockFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/editCmsBlock.form.validator";
import CmsBlock from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import {cmsBlockService} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock.service";
import {cmsBlockToDTO, cmsBlocksToDTO, cmsBlockToSelect, cmsBlocksToSelect} from "@eCommerceModule/utilities/mappers/cmsBlockMapper.dto";

const buildCmsBlockCreateFromSchemaDef = buildCreateDataFromSchemaDef(CmsBlockSchemaDef);
const buildCmsBlockUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(CmsBlockSchemaDef);

export const basePath = "/api/eCommerce/cmsBlock";
export const {router} = createCrudRouter({
    collectionName: "cmsBlocks",
    model: CmsBlock,
    service: cmsBlockService,
    entityName: "CmsBlock",
    selectSearchField: "title",
    defaultSort: {position: 1},
    createSchema: createCmsBlockFormSchema,
    editSchema: editCmsBlockFormSchema,
    toDTO: cmsBlockToDTO,
    toDTOArray: cmsBlocksToDTO,
    toSelect: cmsBlocksToSelect,
    buildCreateData: async (params) => {
        const data = buildCmsBlockCreateFromSchemaDef(params);
        data.config = params.config ?? {};
        if (data.visibility === undefined) {
            data.visibility = {devices: ["desktop", "mobile", "tablet"], regions: []};
        }
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const update = buildCmsBlockUpdateFromSchemaDef(params, writeFields);
        if (params.config !== undefined && (writeFields as any).config) {
            update.config = params.config;
        }
        return update;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

router.post(
    "/reorder",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {orderedIds} = req.body;

        if (!Array.isArray(orderedIds)) return res.status(400).json({message: "orderedIds array required"});

        const bulkOps = orderedIds.map((id: string, index: number) => ({
            updateOne: {
                filter: {_id: new ObjectId(id), company: company._id},
                update: {$set: {position: index}},
            },
        }));

        await CmsBlock.bulkWrite(bulkOps);
        return res.json({message: "Blocks reordered successfully"});
    }),
);

router.get(
    "/public",
    rateLimiter({windowMs: 60000, max: 300}),
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const now = new Date();

        const blocks = await CmsBlock.find({
            company: company._id,
            isActive: true,
            $and: [
                {$or: [{startsAt: null}, {startsAt: {$exists: false}}, {startsAt: {$lte: now}}]},
                {$or: [{endsAt: null}, {endsAt: {$exists: false}}, {endsAt: {$gte: now}}]},
            ],
        }).sort({position: 1}).lean();

        return res.json({data: cmsBlocksToDTO(blocks as any[])});
    }),
);
