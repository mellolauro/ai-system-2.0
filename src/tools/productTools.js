const prisma = require("../prisma");

async function searchProducts({ tenantId, query, maxPrice }) {

  if (!query) return [];
   
  console.log("BUSCANDO PRODUTOS", {
       tenantId,
       query,
       maxPrice
   });

  return prisma.product.findMany({
    where: {
      tenantId,
      active: true,
      name: {
        contains: query,
        mode: "insensitive"
      },
      ...(maxPrice ? { price: { lte: maxPrice } } : {})
    },
    take: 5
  });
}

module.exports = { searchProducts };
