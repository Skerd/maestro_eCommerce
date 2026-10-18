import {ObjectId} from "mongodb";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {TaskRequestActions} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.actions";
import {TaskRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.schema-def";
import {createTaskRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/createTaskRequest.form.validator";
import {editTaskRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/editTaskRequest.form.validator";
import {taskRequestSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.select.form.validator";
import TaskRequest from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import {taskRequestService} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.service";
import {bidService} from "@eCommerceModule/database/schemas/bid/bid.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {taskRequestToDTO, taskRequestsToDTO} from "@eCommerceModule/utilities/mappers/taskRequest/taskRequestMapper.dto";
import {taskRequestsToSelect} from "@eCommerceModule/utilities/mappers/taskRequest/taskRequestMapper.select";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";
import {escapeRegex} from "@coreModule/utilities/helpers";
import SchemaGuard from "@coreModule/database/security/schemaGuard";

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

export const basePath = "/api/eCommerceMarketplace/taskRequest";
export const {router} = createCrudRouter({
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
    extraSelectFilter: async ({activeOnly}) => {
        if (!activeOnly) return {};
        return {status: "open"};
    },
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {logger, languageCode, company, name, limit = 20, page = 1, activeOnly, actionUserCtx} = params;

        logger.start("Fetching taskRequests for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(TaskRequest, { name: {}, title: {} }, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, TaskRequest.schema);

        const filter: Record<string, unknown> = {company: company._id};
        if (name?.trim()) {
            filter["$or"] = {
                name: {$regex: escapeRegex(name.trim()), $options: "i"},
                title: {$regex: escapeRegex(name.trim()), $options: "i"}
            }
        }
        if( activeOnly ){
            filter["status"] = "open";
        }

        const offset = (page - 1) * limit;
        const [taskRequests, total] = await Promise.all([
            taskRequestService.find(filter, {logger, languageCode}, populate.populate, populate.select, {createdAt: -1}, limit, offset),
            taskRequestService.count(filter, {logger, languageCode}),
        ]);

        logger.finish("Finished fetching taskRequests for select!");

        return {data: taskRequestsToSelect(taskRequests), total};
    },
    afterCreate: async (created, params) => {
        const {logger, languageCode, company} = params;
        if (!created.category || !created.address?.city) return;
        const providers = await listingService.aggregate(
            [
                {$match: {company: company._id, category: created.category, "address.city": created.address.city, status: "active", deletedAt: {$exists: false}}},
                {$group: {_id: "$provider"}},
            ],
            {logger, languageCode},
        );
        const providerIds = providers.map((p: any) => p._id?.toString()).filter(Boolean) as string[];
        if (providerIds.length === 0) return;
        emitNotificationEvent(NotificationEventCodes.TASK_REQUEST_CREATED, {
            receiverIds: providerIds,
            payload: {
                companyId: company._id.toString(),
                languageCode,
                taskRequestId: created._id.toString(),
                taskRequestTitle: created.title,
                categoryId: created.category.toString(),
                cityId: created.address.city.toString(),
            },
        });
    },
    enrichList: async (docs, params) => {
        const {logger, languageCode} = params;
        const ids = docs.map((d) => d._id);
        let bidCounts = new Map<string, number>();
        if( ids.length > 0 ){
            const counts = await bidService.aggregate([{$match: {taskRequest: {$in: ids}}}, {$group: {_id: "$taskRequest", count: {$sum: 1}}}], {logger, languageCode});
            counts.forEach((c) => bidCounts.set(c._id.toString(), c.count));
        }
        return taskRequestsToDTO(docs, bidCounts);
    },
    enrichSingle: async (doc, params) => {
        const {logger, languageCode, company} = params;
        return taskRequestToDTO(doc, await bidService.count({taskRequest: doc._id, company: company._id}, {logger, languageCode}));
    },
    enrichUpdate: async (doc, params) => {
        const {logger, languageCode, company} = params;
        return taskRequestToDTO(doc, await bidService.count({taskRequest: doc._id, company: company._id}, {logger, languageCode}));
    },
    buildCreateData: async (params) => {
        const data = buildCreate(params);
        data.requester = new ObjectId(params.actionUserCtx.userId);
        data.status = "open";
        data.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        return data;
    },
    buildUpdateData: buildUpdate,
    rateLimits: {read: 60, write: 30, delete: 20},
    actions: TaskRequestActions,
});
