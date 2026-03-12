const { handleSalesAgent } = require("../agents/salesAgent");
const { handleAIDataAgent } = require("../agents/aiDataAgent");
const { handleSupportAgent } = require("../agents/supportAgent");

function detectIntent(message) {

  const text = message.toLowerCase();

  if (
    text.includes("comprar") ||
    text.includes("produto") ||
    text.includes("preço")
  ) {
    return "sales";
  }

  if (
    text.includes("erro") ||
    text.includes("problema") ||
    text.includes("suporte")
  ) {
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
