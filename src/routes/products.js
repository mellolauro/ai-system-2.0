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

// EDIT FORM
router.get("/edit/:id", async (req, res) => {

  const product = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  const tenants = await prisma.tenant.findMany();

  res.render("product-form", {
    product,
    tenants
  });

});


// UPDATE
router.post("/update/:id", upload.single("image"), async (req, res) => {

  const { name, description, price, stock, tenantId } = req.body;

  await prisma.product.update({

    where: { id: req.params.id },

    data: {
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      tenantId
    }

  });

  res.redirect("/products");

});

// DELETE
router.get("/delete/:id", async (req, res) => {

  await prisma.product.delete({
    where: { id: req.params.id }
  });

  res.redirect("/products");

});


module.exports = router;
