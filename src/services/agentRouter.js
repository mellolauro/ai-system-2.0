const { handleSalesAgent } = require("../agents/salesAgent");
const { handleAIDataAgent } = require("../agents/aiDataAgent");
const { handleSupportAgent } = require("../agents/supportAgent");

function detectIntent(message) {
  const text = message.toLowerCase();

  const salesKeywords = [
    "comprar",
    "preço",
    "valor",
    "quanto custa",
    "contratar",
    "plano",
    "produto"
  ];

  const supportKeywords = [
    "erro",
    "bug",
    "problema",
    "não funciona",
    "suporte",
    "ajuda"
  ];

  if (salesKeywords.some(word => text.includes(word))) {
    return "sales";
  }

  if (supportKeywords.some(word => text.includes(word))) {
    return "support";
  }

  return "ai";
}

/**
 * Router principal
 */
async function routeAgent({ text, user }) {

  const intent = detectIntent(text);

  console.log("Intent detectada:", intent);

  switch (intent) {

    case "sales":
      return handleSalesAgent({ text, user });

    case "support":
      return handleSupportAgent({ text, user });

    case "ai":
    default:
      return handleAIDataAgent({ text, user });

  }
}

module.exports = {
  detectIntent,
  routeAgent
};
