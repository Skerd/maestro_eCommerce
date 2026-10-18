import {ObjectId} from "mongodb";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {
    notifyMatchingProviders,
    TaskRequestActions,
    taskRequestExpiry,
} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.actions";
import {
    TaskRequestSchemaDef,
    type CreateTaskRequestFormType,
    type EditTaskRequestFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.schema-def";
import {createTaskRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/createTaskRequest.form.validator";
import {editTaskRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/editTaskRequest.form.validator";
import {taskRequestSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.select.form.validator";
import TaskRequest, {type ITaskRequest} from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import {taskRequestService} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.service";
import {bidService} from "@eCommerceModule/database/schemas/bid/bid.service";
import {taskRequestToDTO, taskRequestsToDTO} from "@eCommerceModule/utilities/mappers/taskRequest/taskRequestMapper.dto";
import {taskRequestsToSelect} from "@eCommerceModule/utilities/mappers/taskRequest/taskRequestMapper.select";
import {assertOwnerOrAdmin} from "@eCommerceModule/utilities/services/marketplaceAccess";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";
import {escapeRegex} from "@coreModule/utilities/helpers";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";

const mediaUpload = mediaUploadMW({
    fields: {
        mainImage: 1,
        imageGallery: 8,
        videoGallery: 3,
    },
    maxFileSize: 250 * 1024 * 1024,
});

const buildCreate = buildCreateDataFromSchemaDef(TaskRequestSchemaDef);
const buildUpdate = buildUpdateDataFromSchemaDef(TaskRequestSchemaDef);

/** Live bid counts per task request (an aggregate skips the soft-delete filter, so it is explicit). */
async function liveBidCounts(taskRequestIds: ObjectId[], companyId: ObjectId, opts: CrudOptions): Promise<Map<string, number>> {
    const counts = await bidService.aggregate(
        [
            {$match: {taskRequest: {$in: taskRequestIds}, company: companyId, deletedAt: null}},
            {$group: {_id: "$taskRequest", count: {$sum: 1}}},
        ],
        opts,
    );
    return new Map(counts.map((row: {_id: ObjectId; count: number}) => [row._id.toString(), row.count]));
}

export const basePath = "/api/eCommerceMarketplace/taskRequest";
export const {router} = createCrudRouter<ITaskRequest, CreateTaskRequestFormType, EditTaskRequestFormType>({
    collectionName: "taskrequests",
    model: TaskRequest,
    service: taskRequestService,
    entityName: "TaskRequest",
    defaultSort: {createdAt: -1},
    createSchema: createTaskRequestFormSchema,
    editSchema: editTaskRequestFormSchema,
    toDTO: (doc) => taskRequestToDTO(doc),
    toDTOArray: (docs) => taskRequestsToDTO(docs),
    toSelect: taskRequestsToSelect,
    selectSchema: taskRequestSelectFormSchema,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {logger, languageCode, company, name, limit, page, activeOnly, actionUserCtx} = params;

        logger.start("Fetching taskRequests for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(TaskRequest, {name: {}, title: {}}, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, TaskRequest.schema);

        const filter: Record<string, unknown> = {company: company._id};
        if (name?.trim()) {
            const term = escapeRegex(name.trim());
            filter.$or = [
                {name: {$regex: term, $options: "i"}},
                {title: {$regex: term, $options: "i"}},
            ];
        }
        if (activeOnly) {
            filter.status = "open";
        }

        const [taskRequests, total] = await Promise.all([
            taskRequestService.find(filter, {logger, languageCode}, populate.populate, populate.select, {createdAt: -1}, limit, (page - 1) * limit),
            taskRequestService.count(filter, {logger, languageCode}),
        ]);

        logger.finish("Finished fetching taskRequests for select!");

        return {data: taskRequestsToSelect(taskRequests), total};
    },
    afterCreate: async (created, params) => {
        await notifyMatchingProviders(created, params);
    },
    enrichList: async (docs, params) => {
        const {logger, languageCode, company} = params;
        const counts = await liveBidCounts(docs.map((doc) => doc._id), company._id, {logger, languageCode});
        return taskRequestsToDTO(docs, counts);
    },
    enrichSingle: async (doc, params) => {
        const {logger, languageCode, company} = params;
        return taskRequestToDTO(doc, await bidService.count({taskRequest: doc._id, company: company._id}, {logger, languageCode}));
    },
    enrichUpdate: async (doc, params) => {
        const {logger, languageCode, company} = params;
        return taskRequestToDTO(doc, await bidService.count({taskRequest: doc._id, company: company._id}, {logger, languageCode}));
    },
    buildCreateData: (params) => ({
        ...buildCreate(params),
        requester: new ObjectId(params.actionUserCtx.userId),
        status: "open",
        expiresAt: taskRequestExpiry(),
    }),
    buildUpdateData: (params, writeFields) => {
        assertOwnerOrAdmin(params.existing.requester, params.actionUserCtx, params.languageCode);
        return buildUpdate(params, writeFields);
    },
    beforeDelete: async (params, doc) => {
        assertOwnerOrAdmin(doc.requester, params.actionUserCtx, params.languageCode);
        await assertCanDelete(TaskRequest.modelName, doc._id, params.languageCode, params.session);
    },
    rateLimits: {read: 60, write: 30, delete: 20},
    actions: TaskRequestActions,
});
