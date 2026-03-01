const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// Listar todos tenants
router.get("/", async (req, res) => {
  const tenants = await prisma.tenant.findMany();
  res.render("tenants", { tenants });
});

// Ver produtos de um tenant
router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  const products = await prisma.product.findMany({
    where: { tenantId }
  });

  res.render("products", { tenant, products });
});

// Criar produto de um tenant
router.post("/:tenantId/products", async (req, res) => {
  const { tenantId } = req.params;
  const { name, description, price, active } = req.body;

  await prisma.product.create({
    data: {
      name,
      description,
      price: parseFloat(price),
      active: active === "on",
      tenantId
    }
  });

  res.redirect(`/dashboard/${tenantId}`);
});

module.exports = router;
