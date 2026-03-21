const { detectIntent } = require("../services/agentRouter");
const { salesAgent } = require("../agents/salesAgent");
const { ask } = require("../services/openclawClient");

const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || "openrouter/google/gemini-2.5-flash";

async function orchestrateMessage({
  session,
  message,
  text,
  user,
  channel,
  agentType = null,
  systemPrompt = null
}) {

  const tenant = user.tenant;

  const detectedIntent = detectIntent(text);

if (detectedIntent === "sales") {
  // Passamos o nome exato da pasta do agente para o OpenClaw
  return await salesAgent(session, text); 
}

if (detectedIntent === "support") {
  // Você pode criar um supportAgent.js seguindo a mesma lógica do sales
  const supportResponse = await ask({
    text: text,
    session: session?.id || "support",
    agent: "suporte-agent" // Bate com a pasta src/agents/suporte-agent
  });
  if (supportResponse) return supportResponse;
}

  const finalSystemPrompt =
    systemPrompt ||
    `Você é o agente oficial da empresa ${tenant.name}.
Canal: ${channel}.
Seja profissional, claro e objetivo.`;

  try {

    const prompt = `${finalSystemPrompt}

Usuário: ${text}
`;

    const agentFinal = 
      !agentType || agentType === "default"
        ? DEFAULT_MODEL
        : agentType;

    const response = await ask({
       text: text, // O texto limpo do usuário
       session: session?.id || "default",
       agent: agentType || "main", // Use o nome do agente configurado no OpenClaw
       systemPrompt: finalSystemPrompt // Passe o sistema separado
});

    return response;

  } catch (error) {

    console.error("Erro OpenClaw:", error);

    return "Desculpe, estou com instabilidade no momento.";
  }
}

module.exports = { orchestrateMessage };
