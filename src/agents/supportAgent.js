const { ask } = require("../services/openclawClient");

async function supportAgent({ text, user, session }) {
  const systemPrompt = `Você é o técnico de SUPORTE da empresa ${user?.tenant?.name}. 
  Seu objetivo é resolver problemas técnicos com paciência e clareza.`;

  return await ask({
    text: text,
    session: session?.id || "support-session",
    agent: "main", 
    systemPrompt: systemPrompt
  });
}

module.exports = { supportAgent };
