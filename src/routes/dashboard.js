const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

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
        include: { user: true }
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

module.exports = router;
