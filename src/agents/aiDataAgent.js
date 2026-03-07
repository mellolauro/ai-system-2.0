const prisma = require("../prisma");
const { sendToAgent } = require("../services/openclawClient");
const { systemPrompt } = require("../prompts/aiDataPrompt");

async function handleAIDataAgent({ text, user }) {

  const tenantId = user.tenantId;

  /**
   Buscar produtos
  */
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

  /**
   Criar contexto para IA
  */
  const context = `
PRODUTOS DISPONÍVEIS:

${products.map(p => `
${p.name}
Preço: ${p.price}
Estoque: ${p.stock}
`).join("\n")}
`;

  const prompt = `
${systemPrompt}

${context}

Pergunta do cliente:
${text}
`;

  const response = await sendToAgent(
    "vendas-agent",
    `tenant-${tenantId}-user-${user.id}`,
    prompt
  );

  return response;
}

module.exports = { handleAIDataAgent };
