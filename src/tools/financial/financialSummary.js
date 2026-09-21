const { DateTime } =
    require("luxon");

const FinancialService =
    require("../../services/FinancialService");

const DEFAULT_BUSINESS_TIMEZONE =
    "America/Sao_Paulo";

function parseBusinessDate(
    value,
    fieldName,
    zone
) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        throw new Error(
            `${fieldName} deve estar no formato YYYY-MM-DD.`
        );
    }

    const date =
        DateTime.fromISO(
            value,
            {
                zone,
                setZone: true
            }
        );

    if (!date.isValid) {
        throw new Error(
            `${fieldName} contém uma data inválida.`
        );
    }

    return date.startOf("day");
}

module.exports = {

    name:
        "financialSummary",

    description:
        "Consulta o resumo financeiro de pedidos pagos do estabelecimento em um período de datas civis.",

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
                    "Primeiro dia incluído no período, no formato YYYY-MM-DD."
            },

            endDate: {
                type:
                    "string",

                description:
                    "Último dia incluído no período, no formato YYYY-MM-DD."
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

        const zone =
            process.env.BUSINESS_TIMEZONE ||
            DEFAULT_BUSINESS_TIMEZONE;

        if (
            !DateTime.local()
                .setZone(zone)
                .isValid
        ) {
            throw new Error(
                "Timezone operacional inválido."
            );
        }

        const start =
            parseBusinessDate(
                startDate,
                "startDate",
                zone
            );

        const endInclusive =
            parseBusinessDate(
                endDate,
                "endDate",
                zone
            );

        if (start > endInclusive) {
            throw new Error(
                "startDate deve ser anterior ou igual a endDate."
            );
        }

        const endExclusive =
            endInclusive.plus({
                days: 1
            });

        return FinancialService.getPaidSummary({
            tenantId,
            startDate:
                start.toJSDate(),
            endDate:
                endExclusive.toJSDate()
        });

    }

};
