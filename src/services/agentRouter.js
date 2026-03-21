const { salesAgent } = require("../agents/salesAgent");
const { supportAgent } = require("../agents/supportAgent");
const { aiDataAgent } = require("../agents/aiDataAgent");

function detectIntent(message) {
  const text = message.toLowerCase();
  
  const salesKeywords = ["comprar", "produto", "preço", "valor", "tênis", "venda", "estoque"];
  const supportKeywords = ["erro", "problema", "suporte", "ajuda", "não funciona", "configurar"];

  if (salesKeywords.some(kw => text.includes(kw))) return "sales";
  if (supportKeywords.some(kw => text.includes(kw))) return "support";

  return "ai";
}

async function routeAgent({ text, user, session }) {
  const intent = detectIntent(text);
  console.log(`[Router] Intent: ${intent} para o usuário: ${user?.name || 'Cliente'}`);

  const context = { text, user, session };

  switch (intent) {
    case "sales":
      return await salesAgent(context);
    case "support":
      return await supportAgent(context);
    case "ai":
    default:
      return await aiDataAgent(context);
  }
}

module.exports = { detectIntent, routeAgent };
