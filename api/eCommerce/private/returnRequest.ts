import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ReturnRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.schema-def";
import {createReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/createReturnRequest.form.validator";
import {editReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/editReturnRequest.form.validator";
import ReturnRequest from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import {returnRequestToDTO, returnRequestsToDTO} from "@eCommerceModule/utilities/mappers/returnRequestMapper.dto";

const returnRequestTransforms = {
    items: (v: unknown) => v,
} as const;

const buildReturnRequestCreateFromSchemaDef = buildCreateDataFromSchemaDef(ReturnRequestSchemaDef, returnRequestTransforms);
const buildReturnRequestUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(ReturnRequestSchemaDef, returnRequestTransforms);

export const basePath = "/api/eCommerce/returnRequest";
export const {router} = createCrudRouter({
    collectionName: "returnRequests",
    model: ReturnRequest,
    service: returnRequestService,
    entityName: "ReturnRequest",
    defaultSort: {createdAt: -1},
    createSchema: createReturnRequestFormSchema,
    editSchema: editReturnRequestFormSchema,
    toDTO: returnRequestToDTO,
    toDTOArray: returnRequestsToDTO,
    toSelect: (docs: any[]) => docs.map((d: any) => ({value: d._id.toString(), label: d._id.toString()})),
    extraListFilter: async ({orderId, status}) => {
        const filter: Record<string, unknown> = {};
        if (orderId) filter.order = new ObjectId(orderId as string);
        if (status) filter.status = status;
        return filter;
    },
    buildCreateData: async (params) => {
        const mapped = {
            ...params,
            customerNote: params.notes ?? params.customerNote,
        };
        const data = buildReturnRequestCreateFromSchemaDef(mapped);
        if (data.status === undefined) data.status = "pending";
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const mapped = {
            ...params,
            customerNote: params.notes !== undefined ? params.notes : params.customerNote,
        };
        return buildReturnRequestUpdateFromSchemaDef(mapped, writeFields);
    },
    rateLimits: {read: 60, write: 30, delete: 10},
});

router.post(
    "/approve",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {returnRequestId, refundAmount, notes} = req.body;

        if (!returnRequestId) return res.status(400).json({message: "returnRequestId required"});

        const rr = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(returnRequestId), company: company._id, status: "pending"},
            {logger, languageCode},
        );

        await returnRequestService.updateById(
            rr._id,
            {$set: {status: "approved", refundAmount, adminNote: notes || rr.adminNote, resolvedBy: actionUserCtx.userId, resolvedAt: new Date()}},
            {logger, languageCode},
        );

        const updated = await returnRequestService.findById(rr._id, {logger, languageCode});
        return res.json({data: updated ? returnRequestToDTO(updated) : null});
    }),
);

router.post(
    "/reject",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {returnRequestId, reason} = req.body;

        if (!returnRequestId) return res.status(400).json({message: "returnRequestId required"});

        const rr = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(returnRequestId), company: company._id, status: "pending"},
            {logger, languageCode},
        );

        await returnRequestService.updateById(
            rr._id,
            {$set: {status: "rejected", adminNote: reason || rr.adminNote, resolvedBy: actionUserCtx.userId, resolvedAt: new Date()}},
            {logger, languageCode},
        );

        const updated = await returnRequestService.findById(rr._id, {logger, languageCode});
        return res.json({data: updated ? returnRequestToDTO(updated) : null});
    }),
);
