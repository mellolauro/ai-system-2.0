const axios = require("axios");

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

  // Permite no futuro:
  // tenant.plan
  // tenant.model
  // tenant.provider
  const model = tenant.model || process.env.DEFAULT_MODEL;

  // Se vier systemPrompt do agent builder, usa ele.
  // Senão mantém fallback simples.
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
    console.error("Erro no provider:", error.response?.data || error.message);
    return "Erro ao consultar IA.";
  }
}

module.exports = { orchestrateMessage };
