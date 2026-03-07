function detectIntent(message) {
  const text = message.toLowerCase();

  const salesKeywords = [
    "comprar",
    "preço",
    "valor",
    "quanto custa",
    "contratar",
    "plano"
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

  return "default";
}

function routeAgent(message) {

  const intent = detectIntent(message);

  switch (intent) {
    case "sales":
      return "salesAgent";

    case "support":
      return "supportAgent";

    default:
      return "defaultAgent";
  }
}

module.exports = {
  detectIntent,
  routeAgent
};
