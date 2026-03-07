const axios = require("axios");
const { detectIntent } = require("../services/agentRouter");
const { handleSalesAgent } = require("../services/salesAgent");

/**
 * Orquestrador principal do AI-System 2.0
 */
async function orchestrateMessage({
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
   * 🛒 2️⃣ Se for VENDAS → resolver internamente (Prisma)
   */
  if (detectedIntent === "sales") {
    const salesResponse = await handleSalesAgent({ text, user });

    if (salesResponse) {
      return salesResponse;
    }
  }

  /**
   * 🤖 3️⃣ Caso contrário → usar IA
   */
  const model = tenant.model || process.env.DEFAULT_MODEL;

  const finalSystemPrompt =
    systemPrompt ||
    `Você é o agente oficial da empresa ${tenant.name}.
Canal: ${channel}.
Seja profissional, claro e objetivo.`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "system",
            content: finalSystemPrompt
          },
          {
            role: "user",
            content: text
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    const status = error.response?.status;

    console.error("Erro no provider:", {
      status,
      data: error.response?.data
    });

    if (status === 429) {
      return "Sistema temporariamente ocupado. Tente novamente em alguns instantes.";
    }

    return "Erro ao consultar IA.";
  }
}

module.exports = { orchestrateMessage };
