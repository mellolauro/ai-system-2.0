const prisma = require("../prisma");

async function createOrder(userId, tenantId, cart) {

  if (!cart || cart.items.length === 0) {
    throw new Error("Carrinho vazio");
  }

  const total = cart.items.reduce(
    (t, i) => t + i.price * i.qty,
    0
  );

  const order = await prisma.order.create({

    data: {

      tenantId,
      userId,
      total,

      items: {
        create: cart.items.map(i => ({
          productId: i.productId,
          quantity: i.qty,
          price: i.price
        }))
      }

    }

  });

  return order;
}

module.exports = { createOrder };
