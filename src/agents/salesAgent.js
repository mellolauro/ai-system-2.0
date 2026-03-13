const { ask } = require("../services/openclawClient");

async function salesAgent(session, message) {

  const prompt = `
Você é um assistente de vendas.

Pergunta do cliente:
${message}
`;

  const response = await ask(prompt);

  return response;

}

module.exports = { salesAgent };
