const { ask } = require("../services/openclawClient");

async function salesAgent({ text, user, session }) {
  // Criamos um System Prompt específico para o comportamento de vendas
  const systemPrompt = `Você é o especialista de VENDAS da empresa ${user?.tenant?.name || 'nossa loja'}. 
  Seu objetivo é converter curiosidade em vendas, ser persuasivo e cordial. 
  Canal de atendimento: Telegram.`;

  return await ask({
    text: text,
    session: session?.id || "sales-session",
    agent: "main", // Aqui você usa o nome da pasta que contém o SOUL.md principal
    systemPrompt: systemPrompt
  });
}

module.exports = { salesAgent };
