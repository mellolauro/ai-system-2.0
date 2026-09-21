const AdminOrderService =
    require("../../services/AdminOrderService");

module.exports = {

    name:
        "adminListOrders",

    description:
        "Lista os pedidos mais recentes do estabelecimento. Use para consultas administrativas sobre pedidos recentes. O resultado é ordenado do pedido mais recente para o mais antigo.",

    permissions: [
        "orders.read"
    ],

    schema: {
        type:
            "object",

        properties: {
            limit: {
                type:
                    "integer",

                minimum:
                    1,

                maximum:
                    50,

                description:
                    "Quantidade de pedidos a retornar. Use 10 quando nenhuma quantidade específica for necessária."
            }
        },

        required: [],

        additionalProperties:
            false
    },

    async execute({
        tenantId,
        limit = 10
    }) {

        if (!tenantId) {
            throw new Error(
                "Contexto do tenant não disponível."
            );
        }

        const orders =
            await AdminOrderService.listOrders({
                tenantId,
                limit
            });

        return {
            count:
                orders.length,

            orders
        };
    }

};
