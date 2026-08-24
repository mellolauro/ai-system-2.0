const prisma = require("../prisma");

module.exports = {

    name: "addToCart",

    description:
        "Adiciona um produto ao carrinho ativo do usuário dentro do tenant informado.",

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
                    "Quantidade a adicionar."
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

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(
                "quantity deve ser um inteiro maior ou igual a 1."
            );
        }

        const product =
            await prisma.product.findFirst({

                where: {
                    id: productId,
                    tenantId,
                    active: true
                }

            });

        if (!product) {

            throw new Error(
                "Produto não encontrado para este tenant."
            );

        }

        let cart =
            await prisma.cart.findFirst({

                where: {
                    userId,
                    tenantId,
                    status: "active"
                }

            });

        if (!cart) {

            cart =
                await prisma.cart.create({

                    data: {
                        userId,
                        tenantId,
                        status: "active"
                    }

                });

        }

        const existingItem =
            await prisma.cartItem.findFirst({

                where: {
                    cartId: cart.id,
                    productId
                }

            });

        let item;

        if (existingItem) {

            item =
                await prisma.cartItem.update({

                    where: {
                        id: existingItem.id
                    },

                    data: {
                        quantity:
                            existingItem.quantity +
                            quantity
                    }

                });

        } else {

            item =
                await prisma.cartItem.create({

                    data: {
                        cartId: cart.id,
                        productId,
                        quantity
                    }

                });

        }

        return {

            cartId: cart.id,

            itemId: item.id,

            productId,

            quantity: item.quantity

        };

    }

};
