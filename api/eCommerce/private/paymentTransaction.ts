import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import PaymentTransaction from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import {paymentTransactionService} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {paymentTransactionToDTO, paymentTransactionsToDTO} from "@eCommerceModule/utilities/mappers/paymentTransactionMapper.dto";
import {z} from "zod";

export const basePath = "/api/eCommerce/paymentTransaction";
export const {router} = createCrudRouter({
    collectionName: "paymentTransactions",
    model: PaymentTransaction,
    service: paymentTransactionService,
    entityName: "PaymentTransaction",
    defaultSort: {createdAt: -1},
    listSchema: (_lang: string) => z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        orderId: z.string().optional(),
        gateway: z.string().optional(),
        status: z.string().optional(),
    }),
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: paymentTransactionToDTO,
    toDTOArray: paymentTransactionsToDTO,
    toSelect: (docs: any[]) => docs.map((d: any) => ({value: d._id.toString(), label: d.gatewayTransactionId ?? d._id.toString()})),
    extraListFilter: async ({orderId, gateway, status}) => {
        const filter: Record<string, unknown> = {};
        if (orderId) filter.order = new ObjectId(orderId as string);
        if (gateway) filter.gateway = gateway;
        if (status) filter.status = status;
        return filter;
    },
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 0, delete: 0},
});
