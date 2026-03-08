const express = require("express");
const router = express.Router();

const prisma = require("../prisma");

router.get("/", async (req, res) => {

  try {

    const tenantsCount = await prisma.tenant.count();
    const productsCount = await prisma.product.count();
    const usersCount = await prisma.user.count();

    res.render("dashboard", {
      tenantsCount,
      productsCount,
      usersCount
    });

  } catch (error) {

    console.error("Erro no dashboard:", error);

    res.send("Erro ao carregar dashboard");

  }

});

module.exports = router;
