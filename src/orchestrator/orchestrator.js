const { salesAgent } = require("../agents/salesAgent");
const { addToCart } = require("../tools/cartTools");

async function handleMessage({ text, user, session }) {
  try {

    const lower = text.toLowerCase();

    if (lower.includes("sim") && session?.sales?.selectedProduct) {

      await addToCart({
        userId: user.id,
        tenantId: user.tenantId,
        productId: session.sales.selectedProduct.id
      });

      return "🛒 Produto adicionado ao carrinho!";
    }

    return await salesAgent({
      message: text,
      user,
      session
    });

  } catch (err) {
    console.error("🔥 ERRO ORCHESTRATOR:", err);
    return "Erro interno IA.";
  }
}

module.exports = { handleMessage };
