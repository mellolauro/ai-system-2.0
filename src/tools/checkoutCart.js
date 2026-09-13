const OrderService =
    require("../services/OrderService");

module.exports = {

    name: "checkoutCart",

    description:
        "Finaliza o carrinho ativo do usuário, criando o pedido e a entrega com o endereço confirmado pelo cliente.",

    permissions: [
        "orders.create",
        "cart.write"
    ],

    schema: {

        type: "object",

        properties: {

            recipientName: {
                type: "string",
                description:
                    "Nome da pessoa que receberá o pedido, quando informado pelo cliente."
            },

            recipientPhone: {
                type: "string",
                description:
                    "Telefone da pessoa que receberá o pedido, quando informado pelo cliente."
            },

            addressLine: {
                type: "string",
                description:
                    "Endereço de entrega contendo logradouro, número, complemento e bairro quando disponíveis."
            },

            city: {
                type: "string",
                description:
                    "Cidade do endereço de entrega."
            },

            state: {
                type: "string",
                description:
                    "Estado ou UF do endereço de entrega, por exemplo RJ."
            },

            zipCode: {
                type: "string",
                description:
                    "CEP do endereço de entrega."
            },

            reference: {
                type: "string",
                description:
                    "Ponto de referência ou instrução adicional de entrega, quando informado pelo cliente."
            }

        },

        required: [
            "addressLine",
            "city",
            "state",
            "zipCode"
        ],

        additionalProperties: false

    },

    async execute({
        tenantId,
        userId,
        recipientName,
        recipientPhone,
        addressLine,
        city,
        state,
        zipCode,
        reference
    }) {

        return OrderService.checkoutCart({

            tenantId,

            userId,

            recipientName,

            recipientPhone,

            addressLine,

            city,

            state,

            zipCode,

            reference

        });

    }

};
