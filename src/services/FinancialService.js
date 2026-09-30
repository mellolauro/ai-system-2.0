const prisma =
    require("../prisma");

class FinancialService {

    /**
     * Calcula indicadores financeiros a partir
     * de uma coleção de OrderItems.
     *
     * costPrice === null significa custo desconhecido.
     * Nunca deve ser interpretado como custo zero.
     */
    static calculateOrderItems(items = []) {

        let revenue = 0;
        let knownCost = 0;

        let totalUnits = 0;
        let unitsWithKnownCost = 0;

        for (const item of items) {

            const quantity =
                Number(item.quantity) || 0;

            const salePrice =
                Number(item.price) || 0;

            revenue +=
                salePrice * quantity;

            totalUnits +=
                quantity;

            if (
                item.costPrice !== null &&
                item.costPrice !== undefined
            ) {

                const costPrice =
                    Number(item.costPrice);

                if (
                    Number.isFinite(costPrice)
                ) {

                    knownCost +=
                        costPrice * quantity;

                    unitsWithKnownCost +=
                        quantity;

                }

            }

        }

        const missingCostUnits =
            totalUnits -
            unitsWithKnownCost;

        const costCoverage =
            totalUnits > 0
                ? (
                    unitsWithKnownCost /
                    totalUnits
                ) * 100
                : null;

        const hasCompleteCost =
            totalUnits > 0 &&
            missingCostUnits === 0;

        const grossProfit =
            hasCompleteCost
                ? revenue - knownCost
                : null;

        const grossMargin =
            hasCompleteCost &&
            revenue !== 0
                ? (
                    grossProfit /
                    revenue
                ) * 100
                : null;

        return {

            revenue,

            knownCost,

            grossProfit,

            grossMargin,

            totalUnits,

            unitsWithKnownCost,

            missingCostUnits,

            costCoverage,

            hasCompleteCost

        };

    }


    /**
     * Retorna o resumo financeiro dos pedidos pagos
     * de um tenant em determinado período.
     *
     * O período é baseado em paidAt, não createdAt.
     */
    /**
     * Classifica produtos vendidos pela participação
     * no faturamento de pedidos pagos.
     *
     * A: acumulado até 80%
     * B: acumulado até 95%
     * C: restante
     *
     * O produto que cruza um limite permanece na classe
     * correspondente à faixa anterior ao seu acréscimo.
     */
    static calculateProductAbc(items = []) {

        const products =
            new Map();

        for (const item of items) {

            const productId =
                String(
                    item.productId || ""
                );

            if (!productId) {
                continue;
            }

            const quantity =
                Number(item.quantity) || 0;

            const price =
                Number(item.price) || 0;

            const revenue =
                quantity * price;

            const current =
                products.get(productId) || {
                    productId,
                    productName:
                        item.productName ||
                        item.product?.name ||
                        "Produto sem nome",
                    quantity:
                        0,
                    revenue:
                        0
                };

            current.quantity +=
                quantity;

            current.revenue +=
                revenue;

            products.set(
                productId,
                current
            );

        }

        const ranking =
            Array.from(
                products.values()
            )
                .filter(
                    product =>
                        product.revenue > 0
                )
                .sort(
                    (a, b) =>
                        b.revenue -
                        a.revenue
                );

        const totalRevenue =
            ranking.reduce(
                (sum, product) =>
                    sum +
                    product.revenue,
                0
            );

        let cumulativeRevenue =
            0;

        return ranking.map(
            product => {

                const cumulativeBefore =
                    totalRevenue > 0
                        ? (
                            cumulativeRevenue /
                            totalRevenue
                        ) * 100
                        : 0;

                const participation =
                    totalRevenue > 0
                        ? (
                            product.revenue /
                            totalRevenue
                        ) * 100
                        : 0;

                cumulativeRevenue +=
                    product.revenue;

                const cumulativeParticipation =
                    totalRevenue > 0
                        ? (
                            cumulativeRevenue /
                            totalRevenue
                        ) * 100
                        : 0;

                let abcClass =
                    "C";

                if (
                    cumulativeBefore <
                    80
                ) {
                    abcClass =
                        "A";
                } else if (
                    cumulativeBefore <
                    95
                ) {
                    abcClass =
                        "B";
                }

                return {
                    ...product,
                    participation,
                    cumulativeParticipation,
                    abcClass
                };

            }
        );

    }


    /**
     * Retorna a Curva ABC dos produtos vendidos
     * em pedidos pagos de um tenant.
     *
     * O período é baseado em paidAt, não createdAt.
     */
    static async getPaidProductAbc({
        tenantId,
        startDate,
        endDate,
        orderStatus = null
    }) {

        if (!tenantId) {
            throw new Error(
                "tenantId é obrigatório."
            );
        }

        if (
            !(startDate instanceof Date) ||
            Number.isNaN(startDate.getTime())
        ) {
            throw new Error(
                "startDate inválido."
            );
        }

        if (
            !(endDate instanceof Date) ||
            Number.isNaN(endDate.getTime())
        ) {
            throw new Error(
                "endDate inválido."
            );
        }

        if (startDate >= endDate) {
            throw new Error(
                "startDate deve ser anterior a endDate."
            );
        }

        const orders =
            await prisma.order.findMany({

                where: {

                    tenantId,

                    paymentStatus:
                        "PAID",

                    ...(orderStatus
                        ? {
                            status:
                                orderStatus
                        }
                        : {}),

                    paidAt: {
                        gte:
                            startDate,
                        lt:
                            endDate
                    }

                },

                select: {

                    items: {

                        select: {

                            productId:
                                true,

                            productName:
                                true,

                            quantity:
                                true,

                            price:
                                true,

                            product: {
                                select: {
                                    name:
                                        true
                                }
                            }

                        }

                    }

                }

            });

        const items =
            orders.flatMap(
                order =>
                    order.items
            );

        const products =
            this.calculateProductAbc(
                items
            );

        const totalRevenue =
            products.reduce(
                (sum, product) =>
                    sum +
                    product.revenue,
                0
            );

        const totalUnits =
            products.reduce(
                (sum, product) =>
                    sum +
                    product.quantity,
                0
            );

        return {
            products,
            totalRevenue,
            totalUnits,
            productCount:
                products.length,
            period: {
                startDate,
                endDate
            }
        };

    }


    static async getPaidSummary({
        tenantId,
        startDate,
        endDate,
        orderStatus = null
    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (
            !(startDate instanceof Date) ||
            Number.isNaN(startDate.getTime())
        ) {

            throw new Error(
                "startDate inválido."
            );

        }

        if (
            !(endDate instanceof Date) ||
            Number.isNaN(endDate.getTime())
        ) {

            throw new Error(
                "endDate inválido."
            );

        }

        if (
            startDate >=
            endDate
        ) {

            throw new Error(
                "startDate deve ser anterior a endDate."
            );

        }

        const paidWithoutPaidAtCount =
            await prisma.order.count({

                where: {

                    tenantId,

                    paymentStatus:
                        "PAID",

                    ...(orderStatus
                        ? {
                            status:
                                orderStatus
                        }
                        : {}),

                    paidAt:
                        null

                }

            });

        const orders =
            await prisma.order.findMany({

                where: {

                    tenantId,

                    paymentStatus:
                        "PAID",

                    ...(orderStatus
                        ? {
                            status:
                                orderStatus
                        }
                        : {}),

                    paidAt: {

                        gte:
                            startDate,

                        lt:
                            endDate

                    }

                },

                select: {

                    id:
                        true,

                    paidAt:
                        true,

                    total:
                        true,

                    items: {

                        select: {

                            quantity:
                                true,

                            price:
                                true,

                            costPrice:
                                true

                        }

                    }

                }

            });

        const items =
            orders.flatMap(
                order =>
                    order.items
            );

        const calculated =
            this.calculateOrderItems(
                items
            );

        return {

            ...calculated,

            orderCount:
                orders.length,

            paidWithoutPaidAtCount,

            period: {

                startDate,

                endDate

            }

        };

    }

}

module.exports =
    FinancialService;
