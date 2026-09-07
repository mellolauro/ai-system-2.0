const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// GET /dashboard - Visão Geral
router.get("/", async (req, res, next) => {
  try {
    const [
      productsCount,
      usersCount,
      tenantsCount,
      ordersCount,
      paidOrders,
      recentOrders
    ] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.user.count(),
      prisma.tenant.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.order.findMany({
        where: { paymentStatus: "PAID" },
        select: { total: true }
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: true, driver: true }
      })
    ]);

    const totalRevenue = paidOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

    res.render("dashboard", {
      productsCount,
      usersCount,
      tenantsCount,
      ordersCount,
      revenue: totalRevenue,
      recentOrders
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/tracking - Rastreio GPS
router.get("/tracking", async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { name: "asc" }
    });

    res.render("dashboard/tracking", {
      title: "Rastreamento GPS em Tempo Real",
      drivers,
      defaultDriverPhone: drivers.length > 0 ? drivers[0].phone : null
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/drivers - Listar e cadastrar entregadores
router.get("/drivers", async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        _count: { select: { deliveries: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.render("dashboard/drivers", { drivers });
  } catch (err) {
    next(err);
  }
});

// POST /dashboard/drivers - Criar novo entregador
router.post("/drivers", async (req, res, next) => {
  try {
    const { name, phone, vehicle, plate } = req.body;

    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: "Empresa Principal", slug: "empresa-principal" }
      });
    }

    await prisma.driver.create({
      data: {
        name,
        phone,
        vehicle,
        plate,
        tenantId: tenant.id
      }
    });

    res.redirect("/dashboard/drivers");
  } catch (err) {
    next(err);
  }
});

// POST /dashboard/orders/:id/assign-driver - Associar entregador ao pedido
router.post("/orders/:id/assign-driver", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    await prisma.order.update({
      where: { id },
      data: {
        driverId: driverId || null,
        status: driverId ? "SHIPPED" : "PENDING"
      }
    });

    res.redirect(`/orders/${id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
