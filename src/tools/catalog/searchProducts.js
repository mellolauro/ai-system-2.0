const prisma =
    require("../../prisma");

module.exports = {

    name:
        "searchProducts",

    description:
        "Consulta produtos ativos do catálogo por nome, marca, modelo, características ou descrição. Aceita múltiplos termos em qualquer ordem. Quando query não for informada, retorna uma pequena amostra do catálogo.",

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
                    "Nome, marca, modelo, característica ou termos relacionados ao produto. As palavras podem ser informadas em qualquer ordem."

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
                ? query
                    .trim()
                    .replace(/\s+/g, " ")
                : "";


        /*
         * Filtro obrigatório do tenant.
         */
        const where = {

            tenantId,

            active:
                true

        };


        /*
         * =================================================
         * BUSCA POR TERMOS
         * =================================================
         *
         * Em vez de procurar literalmente:
         *
         * "tv smart"
         *
         * dividimos em:
         *
         * ["tv", "smart"]
         *
         * e exigimos que cada termo apareça
         * no nome OU na descrição.
         *
         * Assim:
         *
         * "tv smart"
         * "smart tv"
         *
         * encontram:
         *
         * "Smart TV Hisense"
         */
        if (normalizedQuery) {

            const terms =
                normalizedQuery
                    .split(" ")
                    .map(
                        term =>
                            term.trim()
                    )
                    .filter(
                        term =>
                            term.length >= 2
                    );


            if (
                terms.length > 0
            ) {

                where.AND =
                    terms.map(
                        term => ({

                            OR: [

                                {

                                    name: {

                                        contains:
                                            term,

                                        mode:
                                            "insensitive"

                                    }

                                },

                                {

                                    description: {

                                        contains:
                                            term,

                                        mode:
                                            "insensitive"

                                    }

                                }

                            ]

                        })
                    );

            }

        }


        /*
         * Filtro opcional de preço.
         */
        if (
            maxPrice !== undefined &&
            maxPrice !== null
        ) {

            const price =
                Number(
                    maxPrice
                );


            if (
                !Number.isFinite(
                    price
                )
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


        /*
         * Em pesquisa específica retornamos
         * menos opções.
         *
         * Em consulta geral retornamos uma
         * pequena amostra do catálogo.
         */
        const take =
            normalizedQuery
                ? 3
                : 5;


        const products =
            await prisma.product.findMany({

                where,

                orderBy: {

                    name:
                        "asc"

                },

                take,

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
