const prisma = require("../prisma");

class OrderService {

    async createOrder({
        tenantId,
        userId,
        items
    }) {

        if (!tenantId) {
            throw new Error(
                "tenantId é obrigatório."
            );
        }

        if (!userId) {
            throw new Error(
                "userId é obrigatório."
            );
        }

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            throw new Error(
                "O pedido deve possuir pelo menos um item."
            );
        }

        /*
         * Normaliza e valida os itens.
         */
        const normalizedItems =
            items.map(item => {

                if (!item?.productId) {
                    throw new Error(
                        "Cada item deve possuir productId."
                    );
                }

                const quantity =
                    Number(item.quantity);

                if (
                    !Number.isInteger(quantity) ||
                    quantity < 1
                ) {
                    throw new Error(
                        `Quantidade inválida para o produto ${item.productId}.`
                    );
                }

                return {
                    productId:
                        item.productId,

                    quantity
                };

            });

        /*
         * Consolida itens repetidos.
         */
        const groupedItems =
            new Map();

        for (
            const item
            of normalizedItems
        ) {

            const current =
                groupedItems.get(
                    item.productId
                );

            if (current) {

                current.quantity +=
                    item.quantity;

            } else {

                groupedItems.set(
                    item.productId,
                    {
                        productId:
                            item.productId,

                        quantity:
                            item.quantity
                    }
                );

            }

        }

        const finalItems =
            [...groupedItems.values()];

        /*
         * Busca os produtos dentro do tenant.
         */
        const products =
            await prisma.product.findMany({

                where: {

                    tenantId,

                    active: true,

                    id: {
                        in:
                            finalItems.map(
                                item =>
                                    item.productId
                            )
                    }

                }

            });

        /*
         * Garante que todos os produtos existem.
         */
        if (
            products.length !==
            finalItems.length
        ) {

            const foundIds =
                new Set(
                    products.map(
                        product =>
                            product.id
                    )
                );

            const missing =
                finalItems
                    .filter(
                        item =>
                            !foundIds.has(
                                item.productId
                            )
                    )
                    .map(
                        item =>
                            item.productId
                    );

            throw new Error(
                `Produto(s) não encontrado(s) ou inativo(s): ${missing.join(", ")}`
            );

        }

        const productMap =
            new Map(
                products.map(
                    product => [
                        product.id,
                        product
                    ]
                )
            );

        /*
         * Monta os OrderItems com o preço
         * real vindo do banco.
         */
        const orderItems =
            finalItems.map(item => {

                const product =
                    productMap.get(
                        item.productId
                    );

                if (
                    product.stock <
                    item.quantity
                ) {

                    throw new Error(
                        `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}. Solicitado: ${item.quantity}.`
                    );

                }

                return {

                    productId:
                        product.id,

                    quantity:
                        item.quantity,

                    price:
                        product.price

                };

            });

        /*
         * Total calculado exclusivamente
         * no backend.
         */
        const total =
            orderItems.reduce(
                (
                    sum,
                    item
                ) => {

                    return (
                        sum +
                        (
                            item.price *
                            item.quantity
                        )
                    );

                },
                0
            );

        /*
         * Criação transacional.
         */
        const order =
            await prisma.$transaction(
                async tx => {

                    return tx.order.create({

                        data: {

                            tenantId,

                            userId,

                            status:
                                "PENDING",

                            paymentStatus:
                                "PENDING",

                            total,

                            items: {

                                create:
                                    orderItems

                            }

                        },

                        include: {

                            items: {

                                include: {

                                    product: true

                                }

                            }

                        }

                    });

                }
            );

        return this.serializeOrder(
            order
        );

    }
    
    async checkoutCart({
    tenantId,
    userId
}) {

    if (!tenantId) {

        throw new Error(
            "tenantId é obrigatório."
        );

    }

    if (!userId) {

        throw new Error(
            "userId é obrigatório."
        );

    }

    /*
     * Toda a operação acontece dentro
     * de uma única transação:
     *
     * Cart
     *   ↓
     * CartItem
     *   ↓
     * Order
     *   ↓
     * OrderItem
     *   ↓
     * Cart = checked_out
     */
    const result =
        await prisma.$transaction(
            async tx => {

                const cart =
                    await tx.cart.findFirst({

                        where: {

                            userId,

                            tenantId,

                            status:
                                "active"

                        },

                        include: {

                            items: {

                                include: {

                                    product:
                                        true

                                }

                            }

                        }

                    });

                if (!cart) {

                    throw new Error(
                        "Nenhum carrinho ativo encontrado."
                    );

                }

                if (
                    !cart.items ||
                    cart.items.length === 0
                ) {

                    throw new Error(
                        "O carrinho está vazio."
                    );

                }

                /*
                 * Validação dos produtos
                 * e montagem dos itens do pedido.
                 */
                const orderItems =
                    cart.items.map(
                        item => {

                            const product =
                                item.product;

                            if (!product) {

                                throw new Error(
                                    `Produto não encontrado para o item ${item.id}.`
                                );

                            }

                            if (!product.active) {

                                throw new Error(
                                    `O produto "${product.name}" está inativo.`
                                );

                            }

                            if (
                                product.stock <
                                item.quantity
                            ) {

                                throw new Error(
                                    `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}. Solicitado: ${item.quantity}.`
                                );

                            }

                            return {

                                productId:
                                    product.id,

                                quantity:
                                    item.quantity,

                                price:
                                    product.price

                            };

                        }
                    );

                /*
                 * O total é calculado exclusivamente
                 * a partir dos preços atuais do banco.
                 */
                const total =
                    orderItems.reduce(
                        (
                            sum,
                            item
                        ) => {

                            return (
                                sum +
                                (
                                    item.price *
                                    item.quantity
                                )
                            );

                        },
                        0
                    );

                /*
                 * Cria o pedido e seus itens.
                 */
                const order =
                    await tx.order.create({

                        data: {

                            tenantId,

                            userId,

                            status:
                                "PENDING",

                            paymentStatus:
                                "PENDING",

                            total,

                            items: {

                                create:
                                    orderItems

                            }

                        },

                        include: {

                            items: {

                                include: {

                                    product:
                                        true

                                }

                            }

                        }

                    });

                /*
                 * Fecha o carrinho somente depois
                 * que o pedido foi criado com sucesso.
                 */
                const updatedCart =
                    await tx.cart.update({

                        where: {

                            id:
                                cart.id

                        },

                        data: {

                            status:
                                "checked_out"

                        }

                    });

                return {

                    order,

                    cart:
                        updatedCart

                };

            }
        );

    return {

        order:
            this.serializeOrder(
                result.order
            ),

        cart: {

            id:
                result.cart.id,

            status:
                result.cart.status

        }

    };

}

    async getOrder({
        tenantId,
        userId,
        id
    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (!userId) {

            throw new Error(
                "userId é obrigatório."
            );

        }

        if (!id) {

            throw new Error(
                "id do pedido é obrigatório."
            );

        }

        const order =
            await prisma.order.findFirst({

                where: {

                    id,

                    tenantId,

                    userId

                },

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        if (!order) {

            throw new Error(
                "Pedido não encontrado."
            );

        }

        return this.serializeOrder(
            order
        );

    }

    async updateStatus({
        tenantId,
        userId,
        orderId,
        status
    }) {

        const order =
            await this.getRawOrder({

                tenantId,
                userId,
                orderId

            });

        this.validateStatusTransition(
            order.status,
            status
        );

        const updated =
            await prisma.order.update({

                where: {

                    id:
                        order.id

                },

                data: {

                    status

                },

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        return this.serializeOrder(
            updated
        );

    }

    async updatePaymentStatus({
        tenantId,
        userId,
        orderId,
        paymentStatus
    }) {

        const order =
            await this.getRawOrder({

                tenantId,
                userId,
                orderId

            });

        this.validatePaymentTransition(
            order.paymentStatus,
            paymentStatus
        );

        const data = {

            paymentStatus

        };

        if (
            paymentStatus === "PAID"
        ) {

            data.paidAt =
                new Date();

        }

        if (
            paymentStatus === "REFUNDED"
        ) {

            data.paymentStatus =
                "REFUNDED";

        }

        const updated =
            await prisma.order.update({

                where: {

                    id:
                        order.id

                },

                data,

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        return this.serializeOrder(
            updated
        );

    }
    async getLatestOrder({
        tenantId,
        userId
    }) {

       if (!tenantId) {

          throw new Error(
              "tenantId é obrigatório."
          );

       }

       if (!userId) {

          throw new Error(
              "userId é obrigatório."
          );

       }

       const order =
           await prisma.order.findFirst({

               where: {
 
                   tenantId,

                   userId

              },

              orderBy: {

                  createdAt: "desc"

              },

              include: {

                  items: {

                      include: {

                          product: true

                      }

                  }

              }

          });

       if (!order) {

          return null;

       }

       return this.serializeOrder(
           order
       );

   }
 
   async shipOrder({
        tenantId,
        userId,
        orderId,
        trackingCode,
        carrier
    }) {

        const order =
            await this.getRawOrder({

                tenantId,
                userId,
                orderId

            });

        /*
         * O pedido precisa estar em PROCESSING
         * para ser enviado.
         */
        if (
            order.status !== "PROCESSING"
        ) {

            throw new Error(
                `Pedido ${order.id} precisa estar PROCESSING para ser enviado. Status atual: ${order.status}.`
            );

        }

        /*
         * O pagamento precisa estar confirmado
         * antes da expedição.
         */
        if (
            order.paymentStatus !== "PAID"
        ) {

            throw new Error(
                `Pedido ${order.id} precisa estar com pagamento PAID para ser enviado. Status atual do pagamento: ${order.paymentStatus}.`
            );

        }

        const updated =
            await prisma.order.update({

                where: {

                    id:
                        order.id

                },

                data: {

                    status:
                        "SHIPPED",

                    trackingCode:
                        trackingCode ||
                        null,

                    carrier:
                        carrier ||
                        null,

                    shippedAt:
                        new Date()

                },

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        return this.serializeOrder(
            updated
        );

    }

    async deliverOrder({
        tenantId,
        userId,
        orderId
    }) {

        const order =
            await this.getRawOrder({

                tenantId,
                userId,
                orderId

            });

        if (
            order.status !== "SHIPPED"
        ) {

            throw new Error(
                `Pedido ${order.id} precisa estar SHIPPED para ser entregue. Status atual: ${order.status}.`
            );

        }

        const updated =
            await prisma.order.update({

                where: {

                    id:
                        order.id

                },

                data: {

                    status:
                        "DELIVERED",

                    deliveredAt:
                        new Date()

                },

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        return this.serializeOrder(
            updated
        );

    }

    async cancelOrder({
        tenantId,
        userId,
        orderId
    }) {

        const order =
            await this.getRawOrder({

                tenantId,
                userId,
                orderId

            });

        if (
            [
                "SHIPPED",
                "DELIVERED",
                "CANCELLED"
            ].includes(
                order.status
            )
        ) {

            throw new Error(
                `Pedido ${order.id} não pode ser cancelado no status ${order.status}.`
            );

        }

        const updated =
            await prisma.order.update({

                where: {

                    id:
                        order.id

                },

                data: {

                    status:
                        "CANCELLED",

                    cancelledAt:
                        new Date()

                },

                include: {

                    items: {

                        include: {

                            product: true

                        }

                    }

                }

            });

        return this.serializeOrder(
            updated
        );

    }

    async getRawOrder({
        tenantId,
        userId,
        orderId
    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (!userId) {

            throw new Error(
                "userId é obrigatório."
            );

        }

        if (!orderId) {

            throw new Error(
                "orderId é obrigatório."
            );

        }

        const order =
            await prisma.order.findFirst({

                where: {

                    id:
                        orderId,

                    tenantId,

                    userId

                }

            });

        if (!order) {

            throw new Error(
                "Pedido não encontrado."
            );

        }

        return order;

    }

    validateStatusTransition(
        currentStatus,
        nextStatus
    ) {

        const transitions = {

            PENDING: [

                "PROCESSING",

                "CANCELLED"

            ],

            PROCESSING: [

                "SHIPPED",

                "CANCELLED"

            ],

            /*
             * Mantido para compatibilidade com pedidos
             * que eventualmente utilizem PAID como
             * OrderStatus.
             */
            PAID: [

                "SHIPPED",

                "CANCELLED"

            ],

            SHIPPED: [

                "DELIVERED"

            ],

            DELIVERED: [],

            CANCELLED: [],

            REFUNDED: []

        };

        const allowed =
            transitions[currentStatus] ||
            [];

        /*
         * Não altera se o status já for o mesmo.
         */
        if (
            currentStatus ===
            nextStatus
        ) {

            return true;

        }

        if (
            !allowed.includes(
                nextStatus
            )
        ) {

            throw new Error(
                `Transição de status inválida: ${currentStatus} → ${nextStatus}.`
            );

        }

        return true;

    }

    validatePaymentTransition(
        currentStatus,
        nextStatus
    ) {

        const transitions = {

            PENDING: [

                "PAID",

                "FAILED",

                "CANCELLED"

            ],

            FAILED: [

                "PENDING",

                "CANCELLED"

            ],

            PAID: [

                "REFUNDED"

            ],

            REFUNDED: [],

            CANCELLED: []

        };

        const allowed =
            transitions[currentStatus] ||
            [];

        /*
         * Não altera se o status já for o mesmo.
         */
        if (
            currentStatus ===
            nextStatus
        ) {

            return true;

        }

        if (
            !allowed.includes(
                nextStatus
            )
        ) {

            throw new Error(
                `Transição de pagamento inválida: ${currentStatus} → ${nextStatus}.`
            );

        }

        return true;

    }

    serializeOrder(order) {

        return {

            id:
                order.id,

            tenantId:
                order.tenantId,

            userId:
                order.userId,

            status:
                order.status,

            paymentStatus:
                order.paymentStatus,

            paymentMethod:
                order.paymentMethod,

            total:
                order.total,

            trackingCode:
                order.trackingCode,

            carrier:
                order.carrier,

            paidAt:
                order.paidAt,

            shippedAt:
                order.shippedAt,

            deliveredAt:
                order.deliveredAt,

            cancelledAt:
                order.cancelledAt,

            items:
                Array.isArray(
                    order.items
                )
                    ? order.items.map(
                        item => ({

                            id:
                                item.id,

                            productId:
                                item.productId,

                            productName:
                                item.product?.name ||
                                null,

                            quantity:
                                item.quantity,

                            price:
                                item.price,

                            subtotal:
                                item.price *
                                item.quantity

                        })
                    )
                    : [],

            createdAt:
                order.createdAt,

            updatedAt:
                order.updatedAt

        };

    }

}

module.exports = new OrderService();
