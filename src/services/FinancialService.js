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
    static async getPaidSummary({
        tenantId,
        startDate,
        endDate
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
