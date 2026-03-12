const { sendToAgent } = require("../services/openclawClient");
const prisma = require("../prisma");

async function handleSalesAgent({ text, user }) {

  const products = await prisma.product.findMany({
    where: { active: true }
  });

  const productList = products.map(p =>

    `${p.name} - R$ ${p.price}`

  ).join("\n");

  const prompt = `
Você é um vendedor.

Produtos disponíveis:

${productList}

Pergunta do cliente:
${text}
`;

  return await sendToAgent("sales-agent", prompt);

}

module.exports = { handleSalesAgent };
