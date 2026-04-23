const prisma = require("../prisma");
const { createOrder } = require("../services/orderService");

module.exports = {

  searchProducts: {
    description: "Buscar produtos",

    execute: async ({ query, maxPrice, tenantId }) => {

      return prisma.product.findMany({
        where: {
          tenantId,
          name: { contains: query, mode: "insensitive" },
          price: maxPrice ? { lte: maxPrice } : undefined
        },
        take: 5
      });
    }
  },

  createOrder: {
    description: "Criar pedido",

    execute: async ({ userId, tenantId, items }) => {
      return createOrder(userId, tenantId, { items });
    }
  }

};
