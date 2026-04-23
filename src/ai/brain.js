const { ask } = require("../services/openclawClient");
const { executeTool } = require("../tools/toolEngine");

async function think({ text, context, memory, tools, user }) {

  let iterations = 0;
  let lastResponse = "";

  while (iterations < 3) {

    const prompt = `
Você é uma IA autônoma.

Você pode:
1. Responder normalmente
2. Executar uma ação

Formato de ação:
{
  "action": "nome",
  "data": {}
}

TOOLS:
${Object.keys(tools).join(", ")}

MEMORY:
${JSON.stringify(memory)}

CONTEXT:
${JSON.stringify(context)}

USER:
${text}
`;

    const response = await ask({ text: prompt });

    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch {
      return response;
    }

    if (!parsed.action) {
      return response;
    }

    const result = await executeTool(
      parsed.action,
      parsed.data,
      {
        userId: user.id,
        tenantId: user.tenantId
      }
    );

    lastResponse = `
Resultado da ação:
${JSON.stringify(result)}
`;

    iterations++;
  }

  return lastResponse;
}

module.exports = { think };
