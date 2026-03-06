const prisma = require("../prisma");
const { sendToAgent } = require("./openclawClient");
const { askOpenRouter } = require("./openrouter");

async function handleSalesAgent({ text, user }) {
  const lowerText = text.toLowerCase();
  const tenantId = user.tenantId;

  /**
   * 1️⃣ Listar produtos
   */
  if (lowerText.includes("listar") || lowerText.includes("produtos")) {
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        active: true
      }
    });

    if (!products.length) {
      return "No momento não temos produtos disponíveis.";
    }

    let response = "🛍️ *Produtos disponíveis:*\n\n";

    products.forEach((p, index) => {
      response += `${index + 1}. ${p.name} - R$ ${p.price.toFixed(2)}\n`;
    });

    response += "\nDigite: comprar NOME_DO_PRODUTO";
    return response;
  }

  /**
   * 2️⃣ Comprar produto
   */
  if (lowerText.startsWith("comprar")) {
    const productName = text.replace(/comprar/i, "").trim();

    const product = await prisma.product.findFirst({
      where: {
        tenantId,
        name: {
          contains: productName,
          mode: "insensitive"
        }
      }
    });

    if (!product) {
      return "Produto não encontrado.";
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        tenantId,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1
            }
          ]
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return `✅ Pedido criado com sucesso!

Produto: ${product.name}
Valor: R$ ${product.price.toFixed(2)}

Seu número de pedido é: ${order.id}`;
  }

  /**
   * 3️⃣ Fallback IA OpenClaw → OpenRouter
   */
  try {
    return await sendToAgent(
      "vendas-agent",
      `tenant-${tenantId}-user-${user.id}`,
      text
    );

  } catch (error) {
    console.warn("⚠ OpenClaw falhou:", error.message);

    try {
      return await askOpenRouter(text);
    } catch (fallbackError) {
      console.error("❌ OpenRouter também falhou:", fallbackError.message);
      return "No momento estamos com instabilidade na IA. Tente novamente em instantes.";
    }
  }
}

module.exports = { handleSalesAgent };
