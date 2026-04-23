const { ask } = require("../services/openclawClient");

async function selectAgent({ text, memory }) {

  const prompt = `
Você é um roteador de agentes.

Escolha:
- sales
- support
- general

Baseado em:
Mensagem: ${text}
Memória: ${JSON.stringify(memory)}

Responda apenas o nome.
`;

  const result = await ask({ text: prompt });

  return result.trim().toLowerCase();
}

module.exports = { selectAgent };    
