"use strict";

/*
 * ============================================================
 * PERÍODOS DO DASHBOARD
 * ============================================================
 *
 * Todos os intervalos seguem o padrão:
 *
 *   início inclusivo: >= startDate
 *   fim exclusivo:    <  endDate
 *
 * Isso evita problemas com horários no último dia do período.
 */

function startOfDay(date) {
    const result = new Date(date);

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}

function addDays(date, days) {
    const result = new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
}

function startOfMonth(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );
}

function startOfYear(date) {
    return new Date(
        date.getFullYear(),
        0,
        1
    );
}

function formatDateInput(date) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] =
        value
            .split("-")
            .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function getDashboardPeriod({
    preset = "today",
    start,
    end,
    now = new Date()
} = {}) {
    const today =
        startOfDay(now);

    let startDate;
    let endDate;
    let previousStartDate;
    let previousEndDate;
    let label;

    let normalizedPreset =
        preset;

    switch (preset) {

        case "yesterday":
            startDate =
                addDays(
                    today,
                    -1
                );

            endDate =
                today;

            previousStartDate =
                addDays(
                    startDate,
                    -1
                );

            previousEndDate =
                startDate;

            label =
                "Ontem";

            break;

        case "last7days":
            startDate =
                addDays(
                    today,
                    -6
                );

            endDate =
                addDays(
                    today,
                    1
                );

            previousStartDate =
                addDays(
                    startDate,
                    -7
                );

            previousEndDate =
                startDate;

            label =
                "Últimos 7 dias";

            break;

        case "currentMonth":
            startDate =
                startOfMonth(today);

            endDate =
                addDays(
                    today,
                    1
                );

            previousStartDate =
                new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1
                );

            /*
             * Compara até o mesmo dia do mês anterior,
             * limitado ao último dia disponível.
             *
             * Exemplo:
             * 01/03 a 31/03
             * versus
             * 01/02 a 28/02.
             */
            {
                const previousMonthLastDay =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        0
                    ).getDate();

                const comparisonDay =
                    Math.min(
                        today.getDate(),
                        previousMonthLastDay
                    );

                previousEndDate =
                    new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        comparisonDay + 1
                    );
            }

            label =
                "Mês atual";

            break;

        case "previousMonth":
            endDate =
                startOfMonth(today);

            startDate =
                new Date(
                    endDate.getFullYear(),
                    endDate.getMonth() - 1,
                    1
                );

            previousEndDate =
                startDate;

            previousStartDate =
                new Date(
                    startDate.getFullYear(),
                    startDate.getMonth() - 1,
                    1
                );

            label =
                "Mês anterior";

            break;

        case "currentYear":
            startDate =
                startOfYear(today);

            endDate =
                addDays(
                    today,
                    1
                );

            previousStartDate =
                new Date(
                    today.getFullYear() - 1,
                    0,
                    1
                );

            /*
             * Mesmo intervalo calendário do ano anterior.
             * Em 29/02, anos não bissextos são limitados
             * a 28/02.
             */
            {
                const previousYear =
                    today.getFullYear() - 1;

                const previousYearMonthLastDay =
                    new Date(
                        previousYear,
                        today.getMonth() + 1,
                        0
                    ).getDate();

                const comparisonDay =
                    Math.min(
                        today.getDate(),
                        previousYearMonthLastDay
                    );

                previousEndDate =
                    new Date(
                        previousYear,
                        today.getMonth(),
                        comparisonDay + 1
                    );
            }

            label =
                "Ano atual";

            break;

        case "custom": {
            const parsedStart =
                parseDateInput(start);

            const parsedEnd =
                parseDateInput(end);

            if (
                !parsedStart ||
                !parsedEnd ||
                parsedStart > parsedEnd
            ) {
                normalizedPreset =
                    "today";

                startDate =
                    today;

                endDate =
                    addDays(
                        today,
                        1
                    );

                previousStartDate =
                    addDays(
                        today,
                        -1
                    );

                previousEndDate =
                    today;

                label =
                    "Hoje";

                break;
            }

            startDate =
                startOfDay(
                    parsedStart
                );

            endDate =
                addDays(
                    startOfDay(
                        parsedEnd
                    ),
                    1
                );

            const durationMs =
                endDate.getTime() -
                startDate.getTime();

            previousEndDate =
                new Date(
                    startDate.getTime()
                );

            previousStartDate =
                new Date(
                    previousEndDate.getTime() -
                    durationMs
                );

            label =
                `${start} a ${end}`;

            break;
        }

        case "today":
        default:
            normalizedPreset =
                "today";

            startDate =
                today;

            endDate =
                addDays(
                    today,
                    1
                );

            previousStartDate =
                addDays(
                    today,
                    -1
                );

            previousEndDate =
                today;

            label =
                "Hoje";

            break;
    }

    return {
        preset:
            normalizedPreset,

        label,

        startDate,

        endDate,

        previousStartDate,

        previousEndDate,

        startInput:
            formatDateInput(
                startDate
            ),

        endInput:
            formatDateInput(
                addDays(
                    endDate,
                    -1
                )
            )
    };
}

module.exports = {
    getDashboardPeriod
};
