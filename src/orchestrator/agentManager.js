const { ask } = require("../services/openclawClient");

async function selectAgent(message) {

  const prompt = `
Classifique a intenção do usuário:

Opções:
- sales
- support
- billing

Mensagem:
"${message}"

Responda apenas com o nome do agente.
`;

  const result = await ask({ text: prompt });

  return result.trim().toLowerCase();
}

module.exports = { selectAgent };
