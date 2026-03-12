const { sendToAgent } = require("../services/openclawClient");

async function salesAgent(session, message) {

  const prompt = `
Você é um assistente de vendas.

Pergunta do cliente:
${message}
`;

  return await sendToAgent("sales-agent", prompt);

}

module.exports = { salesAgent };
