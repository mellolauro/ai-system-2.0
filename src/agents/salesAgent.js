const { ask } = require("../services/openclawClient");

async function run({ text, memory }) {
    const prompt = `
Você é um especialista em vendas.

Histórico:
${memory.join("\n")}

Cliente:
${text}

Seja persuasivo e objetivo.
`;

    return ask({ text: prompt, agent: "sales" });
}

module.exports = { run };
