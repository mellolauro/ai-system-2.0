const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// ==========================================
// LISTAGEM DE PEDIDOS
// ==========================================
router.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.render("orders", { orders });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// DETALHES DO PEDIDO
// ==========================================
router.get("/view/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        tenant: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).send("Pedido não encontrado");
    }

    res.render("order-view", { order });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// IMPRESSÃO / RECIBO (SEM LAYOUT PADRÃO)
// ==========================================
router.get("/print/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        tenant: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).send("Pedido não encontrado");
    }

    res.render("order-print", { order, layout: false });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// FORMULÁRIO NOVO PEDIDO
// ==========================================
router.get("/new", async (req, res, next) => {
  try {
    const [users, products, tenants] = await Promise.all([
      prisma.user.findMany(),
      prisma.product.findMany({ where: { active: true } }),
      prisma.tenant.findMany({ where: { active: true } })
    ]);

    res.render("order-form", { users, products, tenants });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
