const axios = require("axios");

/**
 * Orquestrador principal do AI-System 2.0
 */
async function orchestrateMessage({ text, user, channel }) {
  const tenant = user.tenant;

  // Aqui no futuro podemos usar:
  // tenant.plan
  // tenant.agentName
  // tenant.model
  // tenant.provider

  const model = process.env.DEFAULT_MODEL;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: `Você é o agente do tenant ${tenant.name}.` },
          { role: "user", content: text }
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
