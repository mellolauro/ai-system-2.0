const { generateResponse } = require("./modelEngine");

async function handleMessage({ tenantId, userId, message }) {

  const messages = [
    { role: "system", content: "Você é um assistente inteligente." },
    { role: "user", content: message }
  ];

  const { response, model } = await generateResponse(messages);

  return {
    reply: response,
    modelUsed: model
  };
}

module.exports = { handleMessage };
