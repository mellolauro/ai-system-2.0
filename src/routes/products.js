const express = require("express");
const prisma = require("../prisma");
const router = express.Router();

/**
 * Listar produtos do tenant
 */
router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  const products = await prisma.product.findMany({
    where: { tenantId }
  });

  res.json(products);
});

/**
 * Criar produto
 */
router.post("/", async (req, res) => {
  const { name, description, price, tenantId } = req.body;

  const product = await prisma.product.create({
    data: { name, description, price, tenantId }
  });

  res.json(product);
});

module.exports = router;
