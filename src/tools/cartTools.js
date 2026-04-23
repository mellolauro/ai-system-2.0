const prisma = require("../prisma");

async function addToCart({ userId, tenantId, productId }) {
  let cart = await prisma.cart.findFirst({
    where: {
      userId,
      tenantId,
      status: "active"
    }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        tenantId
      }
    });
  }

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      quantity: 1
    }
  });

  return cart;
}

module.exports = { addToCart };
