const { createOrder } = require("../services/orderService");

async function run({ text, user, session }) {
    // exemplo simples de parsing
    const quantityMatch = text.match(/\d+/);
    const quantity = quantityMatch ? parseInt(quantityMatch[0]) : 1;

    if (!session.product) {
        return "Você precisa escolher um produto primeiro.";
    }

    const cart = {
        items: [
            {
                productId: session.product.id,
                qty: quantity,
                price: session.product.price
            }
        ]
    };

    const order = await createOrder(
        user.id,
        user.tenantId,
        cart
    );

    session.step = "start";

    return `✅ Pedido criado!

📦 Produto: ${session.product.name}
🔢 Quantidade: ${quantity}
💰 Total: R$ ${order.total}`;
}

module.exports = { run };
