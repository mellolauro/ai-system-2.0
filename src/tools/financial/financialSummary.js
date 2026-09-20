const FinancialService =
    require("../../services/FinancialService");

module.exports = {

    name:
        "financialSummary",

    description:
        "Consulta o resumo financeiro de pedidos pagos do estabelecimento em um período.",

    permissions: [
        "financial.read"
    ],

    schema: {

        type:
            "object",

        properties: {

            startDate: {
                type:
                    "string",

                description:
                    "Data/hora inicial do período em formato ISO 8601."
            },

            endDate: {
                type:
                    "string",

                description:
                    "Data/hora final exclusiva do período em formato ISO 8601."
            }

        },

        required: [
            "startDate",
            "endDate"
        ],

        additionalProperties:
            false

    },

    async execute({
        tenantId,
        startDate,
        endDate
    }) {

        if (!tenantId) {
            throw new Error(
                "Contexto do tenant não disponível."
            );
        }

        const parsedStartDate =
            new Date(startDate);

        const parsedEndDate =
            new Date(endDate);

        return FinancialService.getPaidSummary({
            tenantId,
            startDate:
                parsedStartDate,
            endDate:
                parsedEndDate
        });

    }

};
