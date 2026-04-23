const { ask } = require("../services/openclawClient");

async function routeAgent({ text, tenantId }) {
    const prompt = `
Classifique a intenção do usuário:

"${text}"

Responda SOMENTE com uma dessas opções:
- sales
- support
- order
- fallback
`;

    const result = await ask({
        text: prompt,
        session: `router-${tenantId}`,
        agent: "router"
    });

    const clean = result.toLowerCase();

    if (clean.includes("sales")) return "sales";
    if (clean.includes("support")) return "support";
    if (clean.includes("order")) return "order";

    return "fallback";
}

module.exports = { routeAgent };
