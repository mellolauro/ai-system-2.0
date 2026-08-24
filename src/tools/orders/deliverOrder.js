const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "deliverOrder",

    description:
        "Marca um pedido enviado como entregue. Operação administrativa.",

    permissions: [
        "orders.deliver"
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

        return OrderService.deliverOrder({

            tenantId,

            userId,

            orderId

        });

    }

};
