const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.count();
    const users = await prisma.user.count();

    res.render("dashboard", {
      products,
      users,
      messages: 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar dashboard");
  }
});

module.exports = router;
