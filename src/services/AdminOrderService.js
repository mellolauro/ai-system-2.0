const prisma =
    require("../prisma");

class AdminOrderService {

    static serializeOrder(order) {

        const delivery =
            Array.isArray(order.deliveries) &&
            order.deliveries.length > 0
                ? order.deliveries[0]
                : null;

        return {
            id:
                order.id,

            status:
                order.status,

            paymentStatus:
                order.paymentStatus,

            paymentMethod:
                order.paymentMethod,

            total:
                order.total,

            customer: order.user
                ? {
                    id:
                        order.user.id,

                    name:
                        order.user.name,

                    phone:
                        order.user.phone,

                    email:
                        order.user.email
                }
                : null,

            trackingCode:
                order.trackingCode,

            carrier:
                order.carrier,

            delivery: delivery
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
                        delivery.reference,

                    estimatedDelivery:
                        delivery.estimatedDelivery,

                    deliveredAt:
                        delivery.deliveredAt
                }
                : null,

            items:
                Array.isArray(order.items)
                    ? order.items.map(
                        item => ({
                            productId:
                                item.productId,

                            productName:
                                item.productName ||
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

            paidAt:
                order.paidAt,

            shippedAt:
                order.shippedAt,

            deliveredAt:
                order.deliveredAt,

            cancelledAt:
                order.cancelledAt,

            createdAt:
                order.createdAt,

            updatedAt:
                order.updatedAt
        };
    }


    static getInclude() {

        return {
            user: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true
                }
            },

            items: {
                include: {
                    product: {
                        select: {
                            name: true
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
                    id: true,
                    status: true,
                    recipientName: true,
                    recipientPhone: true,
                    addressLine: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    reference: true,
                    estimatedDelivery: true,
                    deliveredAt: true
                }
            }
        };
    }


    static async getOrder({
        tenantId,
        orderId
    }) {

        if (!tenantId) {
            throw new Error(
                "tenantId é obrigatório."
            );
        }

        if (
            typeof orderId !== "string" ||
            !orderId.trim()
        ) {
            throw new Error(
                "orderId é obrigatório."
            );
        }

        const order =
            await prisma.order.findFirst({
                where: {
                    id:
                        orderId.trim(),

                    tenantId
                },

                include:
                    this.getInclude()
            });

        if (!order) {
            return null;
        }

        return this.serializeOrder(
            order
        );
    }


    static async listOrders({
        tenantId,
        limit = 10
    }) {

        if (!tenantId) {
            throw new Error(
                "tenantId é obrigatório."
            );
        }

        const normalizedLimit =
            Number(limit);

        if (
            !Number.isInteger(normalizedLimit) ||
            normalizedLimit < 1 ||
            normalizedLimit > 50
        ) {
            throw new Error(
                "limit deve ser um inteiro entre 1 e 50."
            );
        }

        const orders =
            await prisma.order.findMany({
                where: {
                    tenantId
                },

                orderBy: {
                    createdAt:
                        "desc"
                },

                take:
                    normalizedLimit,

                include:
                    this.getInclude()
            });

        return orders.map(
            order =>
                this.serializeOrder(
                    order
                )
        );
    }
}

module.exports =
    AdminOrderService;
