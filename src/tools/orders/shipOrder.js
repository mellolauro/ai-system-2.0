const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "shipOrder",

    description:
        "Despacha um pedido já processado e com pagamento confirmado, registrando transportadora e código de rastreamento. Operação administrativa.",

    permissions: [
        "orders.ship"
    ],

    schema: {

        type: "object",

        properties: {

            orderId: {

                type: "string",

                description:
                    "Identificador do pedido."

            },

            trackingCode: {

                type: "string",

                description:
                    "Código de rastreamento do pedido."

            },

            carrier: {

                type: "string",

                description:
                    "Nome da transportadora."

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

        orderId,

        trackingCode,

        carrier

    }) {

        return OrderService.shipOrder({

            tenantId,

            userId,

            orderId,

            trackingCode,

            carrier

        });

    }

};
