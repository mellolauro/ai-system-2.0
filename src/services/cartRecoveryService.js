const prisma = require("../prisma");

async function findAbandonedCarts() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  return prisma.cart.findMany({
    where: {
      status: "active",
      updatedAt: { lt: tenMinutesAgo }
    },
    include: { user: true }
  });
}

module.exports = { findAbandonedCarts };
