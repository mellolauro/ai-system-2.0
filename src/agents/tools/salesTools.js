const prisma = require("../../prisma");
const { createOrder } = require("../../services/orderService");

module.exports = [

  {
    name: "list_products",
    description: "Lista produtos disponíveis",
    execute: async ({ tenantId }) => {

      const products = await prisma.product.findMany({
        where: { tenantId, active: true }
      });

      return products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price
      }));
    }
  },

  {
    name: "create_order",
    description: "Cria um pedido",
    execute: async ({ userId, tenantId, productId, quantity }) => {

      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) throw new Error("Produto não encontrado");

      const cart = {
        items: [
          {
            productId,
            qty: quantity,
            price: product.price
          }
        ]
      };

      const order = await createOrder(userId, tenantId, cart);

      return {
        success: true,
        orderId: order.id,
        total: order.total
      };
    }
  }

];
