import type {TaskRequestSimple} from "armonia/src/modules/eCommerce/dto/taskRequest.dto";
import type {ITaskRequest} from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const TaskRequestSimpleSnippet = defineSnippet<ITaskRequest, TaskRequestSimple>()({
    keys: {
        _id: {},
        title: {},
        name: {},
        status: {},
    },
});
