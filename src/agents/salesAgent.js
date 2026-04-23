const { searchProducts } = require("../tools/productTools");

async function salesAgent({ message, user, session }) {
  const text = message.toLowerCase();

  session.sales = session.sales || {};

  // Detecta produto de forma mais inteligente
  if (text.includes("mouse")) {
    session.sales.product = "mouse";
  }

  const budgetMatch = text.match(/\d+/);
  if (budgetMatch) {
    session.sales.budget = parseInt(budgetMatch[0]);
  }

  // 🔥 FASE CONSULTIVA (obrigatória)
  if (!session.sales.product) {
    return `Posso te ajudar com vários produtos 👨‍💻\n\nO que você procura exatamente? (ex: mouse, teclado, notebook)`;
  }

  if (!session.sales.budget) {
    return `Perfeito 👍\n\nQual seu orçamento aproximado?`;
  }

  try {

    const products = await searchProducts({
      tenantId: user.tenantId,
      query: session.sales.product,
      maxPrice: session.sales.budget
    });

    if (!products.length) {
      return "Não encontrei nessa faixa 😕 Quer aumentar um pouco o orçamento?";
    }

    const p = products[0];
    session.sales.selectedProduct = p;

    return `🔥 Achei uma ótima opção:\n\n` +
      `🖱️ ${p.name}\n` +
      `💰 R$${p.price}\n\n` +
      `Quer que eu adicione no carrinho?`;

  } catch (err) {
    console.error("Erro no salesAgent:", err);
    return "Tive um problema ao buscar produtos 😕 Tente novamente.";
  }
}

module.exports = { salesAgent };
