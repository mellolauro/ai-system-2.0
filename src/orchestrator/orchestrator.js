const { detectIntent } = require("../services/agentRouter");
const { salesAgent } = require("../agents/salesAgent");
const { ask } = require("../services/openclawClient");

/**
 * Orquestrador principal do AI-System 2.0
 */
async function orchestrateMessage({
  session,
  message,
  text,
  user,
  channel,
  agentType = "default",
  systemPrompt = null
}) {

  const tenant = user.tenant;

  /**
   * 🔎 1️⃣ Detectar intenção automaticamente
   */
  const detectedIntent = detectIntent(text);

  /**
   * 🛒 2️⃣ Se for VENDAS → resolver internamente
   */
  if (detectedIntent === "sales") {

    const salesResponse = await salesAgent(session, message);

    if (salesResponse) {
      return salesResponse;
    }

  }

  /**
   * 🤖 3️⃣ Caso contrário → usar IA via OpenClaw
   */

  const finalSystemPrompt =
    systemPrompt ||
    `Você é o agente oficial da empresa ${tenant.name}.
Canal: ${channel}.
Seja profissional, claro e objetivo.`;

  try {

    const prompt = `${finalSystemPrompt}

Usuário: ${text}
`;

    const response = await ask(prompt);

    return response;

  } catch (error) {

    console.error("Erro OpenClaw:", error);

    return "Erro ao consultar IA.";

  }

}

module.exports = { orchestrateMessage };
