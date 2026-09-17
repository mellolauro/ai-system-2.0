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

                    active:
                        true,

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
         *
         * A baixa de estoque e a criação do pedido
         * pertencem à mesma transação.
         *
         * Se qualquer operação falhar,
         * toda a transação será revertida.
         */
        const order =
            await prisma.$transaction(
                async tx => {

                    /*
                     * Baixa o estoque de forma protegida
                     * contra concorrência.
                     */
                    for (
                        const item
                        of orderItems
                    ) {

                        const updatedStock =
                            await tx.product.updateMany({

                                where: {

                                    id:
                                        item.productId,

                                    tenantId,

                                    active:
                                        true,

                                    stock: {

                                        gte:
                                            item.quantity

                                    }

                                },

                                data: {

                                    stock: {

                                        decrement:
                                            item.quantity

                                    }

                                }

                            });

                        if (
                            updatedStock.count !== 1
                        ) {

                            throw new Error(
                                `Estoque insuficiente ou produto indisponível para ${item.productId}.`
                            );

                        }

                    }

                    /*
                     * Cria o pedido somente depois
                     * da validação/baixa do estoque.
                     */
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

                                    product: {

                                        include: {

                                            images:
                                                true

                                        }

                                    }

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


    /*
     * Finaliza o carrinho ativo.
     *
     * O endereço de entrega só chega aqui
     * depois que o cliente decidiu finalizar
     * o pedido e confirmou o destino.
     *
     * Toda a operação é atômica:
     *
     * Cart
     *   ↓
     * CartItem
     *   ↓
     * valida estoque
     *   ↓
     * baixa estoque
     *   ↓
     * Order
     *   ↓
     * OrderItem
     *   ↓
     * Delivery
     *   ↓
     * Cart = checked_out
     */
    async checkoutCart({
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
         * Endereço de destino obrigatório.
         *
         * Nunca inferimos o endereço a partir
         * da geolocalização do telefone.
         */
        if (
            typeof addressLine !== "string" ||
            !addressLine.trim()
        ) {

            throw new Error(
                "Endereço de entrega é obrigatório."
            );

        }

        if (
            typeof city !== "string" ||
            !city.trim()
        ) {

            throw new Error(
                "Cidade de entrega é obrigatória."
            );

        }

        if (
            typeof state !== "string" ||
            !state.trim()
        ) {

            throw new Error(
                "Estado da entrega é obrigatório."
            );

        }

        if (
            typeof zipCode !== "string" ||
            !zipCode.trim()
        ) {

            throw new Error(
                "CEP da entrega é obrigatório."
            );

        }

        /*
         * Normaliza os dados da entrega.
         */
        const normalizedDelivery = {

            recipientName:
                typeof recipientName === "string" &&
                recipientName.trim()
                    ? recipientName.trim()
                    : null,

            recipientPhone:
                typeof recipientPhone === "string" &&
                recipientPhone.trim()
                    ? recipientPhone.trim()
                    : null,

            addressLine:
                addressLine.trim(),

            city:
                city.trim(),

            state:
                state
                    .trim()
                    .toUpperCase(),

            zipCode:
                zipCode.trim(),

            reference:
                typeof reference === "string" &&
                reference.trim()
                    ? reference.trim()
                    : null

        };

        const result =
            await prisma.$transaction(
                async tx => {

                    /*
                     * Localiza o carrinho ativo.
                     */
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
                     * Valida novamente os produtos
                     * no momento do checkout.
                     *
                     * O preço utilizado é sempre
                     * o preço atual do banco.
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
                     * Baixa o estoque dentro da mesma
                     * transação do checkout.
                     *
                     * O updateMany com stock >= quantity
                     * evita estoque negativo em caso de
                     * checkouts concorrentes.
                     */
                    for (
                        const item
                        of orderItems
                    ) {

                        const updatedStock =
                            await tx.product.updateMany({

                                where: {

                                    id:
                                        item.productId,

                                    tenantId,

                                    active:
                                        true,

                                    stock: {

                                        gte:
                                            item.quantity

                                    }

                                },

                                data: {

                                    stock: {

                                        decrement:
                                            item.quantity

                                    }

                                }

                            });

                        if (
                            updatedStock.count !== 1
                        ) {

                            throw new Error(
                                `Estoque insuficiente ou produto indisponível para ${item.productId}.`
                            );

                        }

                    }

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
                     * Cria o destino operacional
                     * da entrega.
                     */
                    const delivery =
                        await tx.delivery.create({

                            data: {

                                orderId:
                                    order.id,

                                tenantId,

                                status:
                                    "PENDING",

                                recipientName:
                                    normalizedDelivery
                                        .recipientName,

                                recipientPhone:
                                    normalizedDelivery
                                        .recipientPhone,

                                addressLine:
                                    normalizedDelivery
                                        .addressLine,

                                city:
                                    normalizedDelivery
                                        .city,

                                state:
                                    normalizedDelivery
                                        .state,

                                zipCode:
                                    normalizedDelivery
                                        .zipCode,

                                reference:
                                    normalizedDelivery
                                        .reference

                            }

                        });

                    /*
                     * Fecha o carrinho somente depois
                     * que estoque, Order, OrderItems
                     * e Delivery foram processados.
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

                        delivery,

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

            delivery: {

                id:
                    result.delivery.id,

                orderId:
                    result.delivery.orderId,

                status:
                    result.delivery.status,

                recipientName:
                    result.delivery.recipientName,

                recipientPhone:
                    result.delivery.recipientPhone,

                addressLine:
                    result.delivery.addressLine,

                city:
                    result.delivery.city,

                state:
                    result.delivery.state,

                zipCode:
                    result.delivery.zipCode,

                reference:
                    result.delivery.reference,

                latitude:
                    result.delivery.latitude,

                longitude:
                    result.delivery.longitude

            },

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

                            product: {

                                include: {

                                    images:
                                        true

                                }

                            }

                        }

                    },

                    deliveries: {

                        orderBy: {

                            createdAt:
                                "desc"

                        },

                        take:
                            1,

                        select: {

                            id:
                                true,

                            status:
                                true,

                            recipientName:
                                true,

                            recipientPhone:
                                true,

                            addressLine:
                                true,

                            city:
                                true,

                            state:
                                true,

                            zipCode:
                                true,

                            reference:
                                true

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

                            product:
                                true

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
            paymentStatus ===
            "PAID"
        ) {

            data.paidAt =
                new Date();

        }

        if (
            paymentStatus ===
            "REFUNDED"
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

                            product:
                                true

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

                    createdAt:
                        "desc"

                },

                include: {

                    items: {

                        include: {

                            product: {

                                include: {

                                    images:
                                        true

                                }

                            }

                        }

                    },

                    deliveries: {

                        orderBy: {

                            createdAt:
                                "desc"

                        },

                        take:
                            1,

                        select: {

                            id:
                                true,

                            status:
                                true,

                            recipientName:
                                true,

                            recipientPhone:
                                true,

                            addressLine:
                                true,

                            city:
                                true,

                            state:
                                true,

                            zipCode:
                                true,

                            reference:
                                true

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

        if (
            order.status !==
            "PROCESSING"
        ) {

            throw new Error(
                `Pedido ${order.id} precisa estar PROCESSING para ser enviado. Status atual: ${order.status}.`
            );

        }

        if (
            order.paymentStatus !==
            "PAID"
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

                            product:
                                true

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
            order.status !==
            "SHIPPED"
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

                            product:
                                true

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

                            product:
                                true

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

        const delivery =
            Array.isArray(
                order.deliveries
            ) &&
            order.deliveries.length > 0
                ? order.deliveries[0]
                : null;

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

            delivery:
                delivery
                    ? {

                        id:
                            delivery.id,

                        status:
                            delivery.status,

                        recipientName:
                            delivery.recipientName,

                        recipientPhone:
                            delivery.recipientPhone,

                        addressLine:
                            delivery.addressLine,

                        city:
                            delivery.city,

                        state:
                            delivery.state,

                        zipCode:
                            delivery.zipCode,

                        reference:
                            delivery.reference

                    }
                    : null,

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
                                item.quantity,

                            images:
                                Array.isArray(
                                    item.product?.images
                                )
                                    ? item.product.images.map(
                                        image => ({

                                            type:
                                                "image",

                                            url:
                                                image.url

                                        })
                                    )
                                    : []

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
