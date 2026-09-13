const prisma =
    require("../../prisma");

module.exports = {

    name:
        "searchProducts",

    description:
        "Consulta produtos ativos do catálogo. Quando query for informada, pesquisa pelo nome ou descrição. Quando query não for informada, retorna uma pequena amostra do catálogo para permitir visão geral dos produtos disponíveis.",

    permissions: [
        "products.read"
    ],

    schema: {

        type:
            "object",

        properties: {

            query: {

                type:
                    "string",

                description:
                    "Nome, marca, modelo, característica ou parte da descrição do produto. Opcional para consultas gerais sobre o catálogo."

            },

            maxPrice: {

                type:
                    "number",

                description:
                    "Preço máximo dos produtos. Opcional."

            }

        },

        required: [],

        additionalProperties:
            false

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

        const normalizedQuery =
            typeof query === "string"
                ? query.trim()
                : "";

        /*
         * Filtro base obrigatório.
         */
        const where = {

            tenantId,

            active:
                true

        };

        /*
         * Só aplica pesquisa textual quando
         * realmente existe uma query.
         *
         * Quando a consulta é ampla, o agente
         * pode chamar a ferramenta sem query
         * para obter uma pequena amostra
         * do catálogo.
         */
        if (normalizedQuery) {

            where.OR = [

                {

                    name: {

                        contains:
                            normalizedQuery,

                        mode:
                            "insensitive"

                    }

                },

                {

                    description: {

                        contains:
                            normalizedQuery,

                        mode:
                            "insensitive"

                    }

                }

            ];

        }

        /*
         * Filtro opcional de preço.
         */
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

                lte:
                    price

            };

        }

        const products =
            await prisma.product.findMany({

                where,

                orderBy: {

                    name:
                        "asc"

                },

                /*
                 * Evita despejar todo o catálogo
                 * em consultas amplas.
                 */
                take:
                    5,

                include: {

                    images: {

                        take:
                            1,

                        select: {

                            id:
                                true,

                            url:
                                true

                        }

                    }

                }

            });

        return products;

    }

};
