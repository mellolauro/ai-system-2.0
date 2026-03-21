const prisma = require("../prisma");
const { ask } = require("../services/openclawClient"); // Import correto
const { systemPrompt } = require("../prompts/aiDataPrompt");

async function handleAIDataAgent({ text, user, session }) {
  const tenantId = user.tenantId;

  try {
    // 1. Busca produtos reais do Prisma
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        active: true
      },
      select: {
        name: true,
        price: true,
        stock: true
      }
    });

    // 2. Formata a vitrine de produtos para o contexto da IA
    const contextProducts = products.length > 0 
      ? products.map(p => `- ${p.name}: R$ ${p.price} (Estoque: ${p.stock})`).join("\n")
      : "Nenhum produto cadastrado no momento.";

    // 3. Monta o corpo da mensagem
    const fullMessage = `
CONTEXTO DA LOJA (PRODUTOS):
${contextProducts}

PERGUNTA DO USUÁRIO:
${text}
`;

    // 4. Chama o OpenClaw com a assinatura de objeto correta
    const response = await ask({
      text: fullMessage,
      session: session?.id || `tenant-${tenantId}`,
      agent: "main", // Mudamos para "main" pois você mencionou não ter o "vendas-agent" configurado no OpenClaw
      systemPrompt: systemPrompt
    });

    return response;

  } catch (error) {
    console.error("❌ Erro no AIDataAgent:", error.message);
    return "Desculpe, tive um problema ao consultar nosso estoque. Pode repetir?";
  }
}

module.exports = { handleAIDataAgent };
