const OrderService =
    require("../services/OrderService");

module.exports = {

    name: "checkoutCart",

    description:
        "Finaliza o carrinho ativo do usuário, criando um pedido com os preços atuais e marcando o carrinho como checked_out.",

    permissions: [
        "orders.create",
        "cart.write"
    ],

    schema: {

        type: "object",

        properties: {},

        required: [],

        additionalProperties: false

    },

    async execute({
        tenantId,
        userId
    }) {

        return OrderService.checkoutCart({

            tenantId,

            userId

        });

    }

};
