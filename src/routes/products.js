const express = require("express");
const router = express.Router();

const prisma = require("../prisma");
const upload = require("../config/upload");

// ======================
// LISTAR PRODUTOS
// ======================
router.get("/", async (req, res) => {

  const products = await prisma.product.findMany({
    include: { images: true }
  });

  res.render("products", { products });

});

// ======================
// FORM NOVO PRODUTO
// ======================
router.get("/new", async (req, res) => {

  const tenants = await prisma.tenant.findMany();

  res.render("product-form", {
    tenants
  });

});

// ======================
// CRIAR PRODUTO
// ======================
router.post("/create", upload.single("image"), async (req, res) => {

  try {

    const { name, description, price, stock, tenantId } = req.body;

    const product = await prisma.product.create({

      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        tenantId
      }

    });

    if (req.file) {

      await prisma.productImage.create({

        data: {
          url: "/uploads/products/" + req.file.filename,
          productId: product.id
        }

      });

    }

    res.redirect("/products");

  } catch (error) {

    console.error(error);
    res.status(500).send("Erro ao criar produto");

  }

});

module.exports = router;
