const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "createOrder",

    description:
        "Cria um pedido com os produtos informados e calcula o total com base nos preços atuais.",

    permissions: [
        "orders.create"
    ],

    schema: {

        type: "object",

        properties: {

            items: {

                type: "array",

                description:
                    "Produtos que serão incluídos no pedido.",

                items: {

                    type: "object",

                    properties: {

                        productId: {
                            type: "string"
                        },

                        quantity: {
                            type: "integer",
                            minimum: 1
                        }

                    },

                    required: [
                        "productId",
                        "quantity"
                    ],

                    additionalProperties: false

                },

                minItems: 1

            }

        },

        required: [
            "items"
        ],

        additionalProperties: false

    },

    async execute({

        tenantId,

        userId,

        items

    }) {

        return OrderService.createOrder({

            tenantId,

            userId,

            items

        });

    }

};
