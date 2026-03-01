const { resolveTenantByTelegram } = require("../services/tenantService");
const { sendToAgent } = require("../services/openclawClient");

async function handleIncomingMessage(msg) {
  const telegramId = String(msg.from.id);
  const text = msg.text;

  const tenant = await resolveTenantByTelegram(telegramId);

  const response = await sendToAgent(
    tenant.agentName,
    telegramId,
    text
  );

  return response;
}

module.exports = { handleIncomingMessage };
