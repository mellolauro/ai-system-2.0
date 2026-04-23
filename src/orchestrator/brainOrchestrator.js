const { loadMemory, saveMemory } = require("../ai/memoryEngine");
const { buildContext } = require("../ai/contextBuilder");
const { selectAgent } = require("../ai/agentSelector");
const { think } = require("../ai/brain");
const { generateFinalResponse } = require("../ai/responseEngine");
const { loadTenantTools } = require("../tools/dynamicTools");
const prisma = require("../prisma");

async function handleMessage({ text, user, tenantId }) {

  // 1. memória
  const memory = await loadMemory(user.id);

  // 2. contexto
  const context = await buildContext(user.id, tenantId);

  // 3. tools
  const tools = await loadTenantTools(tenantId);

  // 4. agente
  const agent = await selectAgent({ text, memory });

  // 5. pensar
  const raw = await think({
    text,
    context,
    memory,
    tools,
    user,
    agent
  });

  // 6. resposta final
  const final = await generateFinalResponse({
    raw,
    memory
  });

  // 7. salvar conversa
  await prisma.message.create({
    data: {
      role: "user",
      content: text,
      conversation: {
        connectOrCreate: {
          where: {
            id: `${user.id}-${tenantId}`
          },
          create: {
            id: `${user.id}-${tenantId}`,
            userId: user.id,
            tenantId
          }
        }
      }
    }
  });

  await prisma.message.create({
    data: {
      role: "assistant",
      content: final,
      conversationId: `${user.id}-${tenantId}`
    }
  });

  return final;
}

module.exports = { handleMessage };
