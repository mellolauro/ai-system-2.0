const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "cancelOrder",

    description:
        "Cancela um pedido que ainda pode ser cancelado. Operação administrativa.",

    permissions: [
        "orders.cancel"
    ],

    schema: {

        type: "object",

        properties: {

            orderId: {

                type: "string",

                description:
                    "Identificador do pedido."

            }

        },

        required: [
            "orderId"
        ],

        additionalProperties: false

    },

    async execute({

        tenantId,

        userId,

        orderId

    }) {

        return OrderService.cancelOrder({

            tenantId,

            userId,

            orderId

        });

    }

};
