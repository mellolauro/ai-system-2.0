const prisma = require("../../prisma");

module.exports = {

    name: "getProduct",

    description:
        "Obtém os dados de um produto ativo pertencente ao tenant informado.",

    permissions: [
        "products.read"
    ],

    schema: {

        type: "object",

        properties: {

            tenantId: {

                type: "string",

                description:
                    "Identificador do tenant."

            },

            id: {

                type: "string",

                description:
                    "Identificador do produto."

            }

        },

        required: [
            "tenantId",
            "id"
        ],

        additionalProperties: false

    },

    async execute({

        tenantId,

        id

    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (!id) {

            throw new Error(
                "id do produto é obrigatório."
            );

        }

        return prisma.product.findFirst({

            where: {

                id,

                tenantId,

                active: true

            }

        });

    }

};
