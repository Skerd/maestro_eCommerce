import TaskRequest, { ITaskRequest } from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import { BaseCrudService } from "@coreModule/database/services/baseCrudService";

export class TaskRequestService extends BaseCrudService<ITaskRequest, typeof TaskRequest> {
    constructor() {
        super(TaskRequest, "TaskRequest");
    }
}

export const taskRequestService = new TaskRequestService();
