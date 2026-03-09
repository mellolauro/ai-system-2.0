const prisma = require("../prisma");

async function createOrder(userId, tenantId, productId, quantity) {

  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  const total = product.price * quantity;

  const order = await prisma.order.create({
    data: {
      userId,
      tenantId,
      total,
      items: {
        create: [
          {
            productId,
            quantity,
            price: product.price
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  return order;
}

module.exports = {
  createOrder
};
