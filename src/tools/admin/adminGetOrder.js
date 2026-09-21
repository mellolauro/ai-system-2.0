const AdminOrderService =
    require("../../services/AdminOrderService");

module.exports = {

    name:
        "adminGetOrder",

    description:
        "Consulta um pedido específico do estabelecimento pelo identificador do pedido. Retorna cliente, status, pagamento, total, itens, entrega, rastreamento e datas do pedido.",

    permissions: [
        "orders.read"
    ],

    schema: {
        type:
            "object",

        properties: {
            orderId: {
                type:
                    "string",

                description:
                    "Identificador do pedido que será consultado."
            }
        },

        required: [
            "orderId"
        ],

        additionalProperties:
            false
    },

    async execute({
        tenantId,
        orderId
    }) {

        if (!tenantId) {
            throw new Error(
                "Contexto do tenant não disponível."
            );
        }

        const order =
            await AdminOrderService.getOrder({
                tenantId,
                orderId
            });

        if (!order) {
            return {
                found:
                    false,

                message:
                    "Pedido não encontrado neste estabelecimento."
            };
        }

        return {
            found:
                true,

            order
        };
    }

};
