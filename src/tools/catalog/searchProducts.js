const prisma = require("../../prisma");

module.exports = {

    name: "searchProducts",

    description:
        "Pesquisa produtos ativos pelo nome ou descrição dentro do tenant informado, podendo limitar o preço máximo. Retorna também as imagens cadastradas do produto.",

    permissions: [
        "products.read"
    ],

    schema: {

        type: "object",

        properties: {

            tenantId: {

                type: "string",

                description:
                    "Identificador do tenant ao qual os produtos pertencem."

            },

            query: {

                type: "string",

                description:
                    "Nome ou parte do nome ou descrição do produto."

            },

            maxPrice: {

                type: "number",

                description:
                    "Preço máximo dos produtos. Opcional."

            }

        },

        required: [
            "tenantId",
            "query"
        ],

        additionalProperties: false

    },

    async execute({

        tenantId,
        query,
        maxPrice

    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (!query) {

            return [];

        }

        const where = {

            tenantId,

            active: true,

            OR: [

                {

                    name: {

                        contains: query,

                        mode:
                            "insensitive"

                    }

                },

                {

                    description: {

                        contains: query,

                        mode:
                            "insensitive"

                    }

                }

            ]

        };

        if (
            maxPrice !== undefined &&
            maxPrice !== null
        ) {

            const price =
                Number(maxPrice);

            if (
                !Number.isFinite(price)
            ) {

                throw new Error(
                    "maxPrice deve ser numérico."
                );

            }

            where.price = {

                lte: price

            };

        }

        const products =
            await prisma.product.findMany({

                where,

                orderBy: {

                    name:
                        "asc"

                },

                take: 5,

                include: {

                    images: {

                        take: 1,

                        select: {

                            id: true,

                            url: true

                        }

                    }

                }

            });

        return products;

    }

};
