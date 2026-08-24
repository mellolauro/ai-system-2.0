const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "updatePaymentStatus",

    description:
        "Atualiza o status de pagamento de um pedido. Operação administrativa.",

    permissions: [
        "orders.payment.update"
    ],

    schema: {

        type: "object",

        properties: {

            orderId: {

                type: "string",

                description:
                    "Identificador do pedido."

            },

            paymentStatus: {

                type: "string",

                enum: [
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUNDED",
                    "CANCELLED"
                ],

                description:
                    "Novo status do pagamento."

            }

        },

        required: [
            "orderId",
            "paymentStatus"
        ],

        additionalProperties: false

    },

    async execute({
        tenantId,
        userId,
        orderId,
        paymentStatus
    }) {

        return OrderService.updatePaymentStatus({

            tenantId,

            userId,

            orderId,

            paymentStatus

        });

    }

};
