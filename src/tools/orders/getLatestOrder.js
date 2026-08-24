const OrderService =
    require("../../services/OrderService");

module.exports = {

    name: "getLatestOrder",

    description:
        "Use esta ferramenta sempre que o usuário perguntar sobre o pedido mais recente, status do pedido, pagamento, rastreamento, transportadora ou entrega. Não invente informações de pedidos. Para um pedido específico identificado por ID, use getOrder.",

    permissions: [
        "orders.read"
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

        const order =
            await OrderService.getLatestOrder({

                tenantId,
                userId

            });

        if (!order) {

            return {
                found: false,
                message:
                    "Nenhum pedido encontrado para este usuário."
            };

        }

        return {

            found: true,

            order

        };

    }

};
