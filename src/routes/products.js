const express = require("express");
const router = express.Router();

const prisma = require("../prisma");

router.get("/", async (req, res) => {

const products = await prisma.product.findMany();

res.render("products", { products });

});

module.exports = router;
