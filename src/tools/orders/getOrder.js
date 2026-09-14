const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "getOrder",

    description:
        "Consulta um pedido específico do usuário, incluindo status, pagamento, rastreamento, total, itens e endereço de entrega quando houver Delivery vinculada ao pedido.",

    permissions: [
        "orders.read"
    ],

    schema: {

        type: "object",

        properties: {

            id: {

                type: "string",

                description:
                    "Identificador do pedido."

            }

        },

        required: [
            "id"
        ],

        additionalProperties: false

    },

    async execute({

        tenantId,

        userId,

        id

    }) {

        return OrderService.getOrder({

            tenantId,

            userId,

            id

        });

    }

};
