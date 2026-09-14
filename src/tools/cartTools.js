const prisma = require("../prisma");

module.exports = {

    name: "addToCart",

    description:
        "Adiciona uma quantidade de um produto ao carrinho ativo do usuário dentro do tenant informado. Se o produto já estiver no carrinho, a quantidade informada será somada à quantidade existente. Nunca use esta ferramenta novamente sem uma nova intenção explícita do usuário de adicionar mais unidades.",

    permissions: [
        "cart.write"
    ],

    schema: {

        type: "object",

        properties: {

            userId: {
                type: "string",
                description:
                    "Identificador do usuário."
            },

            tenantId: {
                type: "string",
                description:
                    "Identificador do tenant."
            },

            productId: {
                type: "string",
                description:
                    "Identificador do produto."
            },

            quantity: {
                type: "integer",
                minimum: 1,
                description:
                    "Quantidade a adicionar ao carrinho."
            }

        },

        required: [
            "userId",
            "tenantId",
            "productId"
        ],

        additionalProperties: false

    },

    async execute({

        userId,
        tenantId,
        productId,
        quantity = 1

    }) {

        if (!userId) {
            throw new Error(
                "userId é obrigatório."
            );
        }

        if (!tenantId) {
            throw new Error(
                "tenantId é obrigatório."
            );
        }

        if (!productId) {
            throw new Error(
                "productId é obrigatório."
            );
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            throw new Error(
                "quantity deve ser um inteiro maior ou igual a 1."
            );
        }

        /*
         * Busca o produto dentro do tenant.
         */
        const product =
            await prisma.product.findFirst({

                where: {

                    id:
                        productId,

                    tenantId,

                    active:
                        true

                }

            });

        if (!product) {

            throw new Error(
                "Produto não encontrado para este tenant."
            );

        }

        /*
         * Não permite adicionar quantidade superior
         * ao estoque atual.
         *
         * O carrinho não faz baixa de estoque.
         * A baixa definitiva ocorre somente no checkout.
         */
        if (
            quantity >
            product.stock
        ) {

            throw new Error(
                `Quantidade solicitada excede o estoque disponível de "${product.name}". Estoque disponível: ${product.stock}.`
            );

        }

        /*
         * Procura um carrinho ativo.
         */
        let cart =
            await prisma.cart.findFirst({

                where: {

                    userId,

                    tenantId,

                    status:
                        "active"

                }

            });

        /*
         * Cria um carrinho se ainda não existir.
         */
        if (!cart) {

            cart =
                await prisma.cart.create({

                    data: {

                        userId,

                        tenantId,

                        status:
                            "active"

                    }

                });

        }

        /*
         * Verifica se o produto já existe
         * no carrinho.
         */
        const existingItem =
            await prisma.cartItem.findFirst({

                where: {

                    cartId:
                        cart.id,

                    productId

                }

            });

        let item;

        /*
         * Se já existir, soma a nova quantidade
         * à quantidade presente no carrinho.
         */
        if (existingItem) {

            const newQuantity =
                existingItem.quantity +
                quantity;

            if (
                newQuantity >
                product.stock
            ) {

                throw new Error(
                    `Quantidade solicitada excede o estoque disponível de "${product.name}". Estoque disponível: ${product.stock}. Quantidade atual no carrinho: ${existingItem.quantity}.`
                );

            }

            item =
                await prisma.cartItem.update({

                    where: {

                        id:
                            existingItem.id

                    },

                    data: {

                        quantity:
                            newQuantity

                    }

                });

        } else {

            /*
             * Produto ainda não existe no carrinho.
             */
            item =
                await prisma.cartItem.create({

                    data: {

                        cartId:
                            cart.id,

                        productId,

                        quantity

                    }

                });

        }

        return {

            cartId:
                cart.id,

            itemId:
                item.id,

            productId,

            quantity:
                item.quantity,

            addedQuantity:
                quantity,

            stockAvailable:
                product.stock

        };

    }

};
