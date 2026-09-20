const express = require("express");
const router = express.Router();

const prisma = require("../prisma");
const upload = require("../config/upload");

const {
  csrfSynchronisedProtection
} = require("../middleware/csrf");

function getProductValidationError(error) {
  const errors = {
    INVALID_PRODUCT_PRICE: "invalid_price",
    INVALID_PRODUCT_COST_PRICE: "invalid_cost_price",
    INVALID_PRODUCT_STOCK: "invalid_stock"
  };

  return errors[error?.message] || null;
}

function parseProductNumbers({ price, costPrice, stock }) {
  const normalizedPrice = String(price ?? "")
    .trim()
    .replace(",", ".");

  const normalizedCostPrice =
    costPrice === undefined ||
    costPrice === null ||
    String(costPrice).trim() === ""
      ? null
      : String(costPrice).trim().replace(",", ".");

  const normalizedStock = String(stock ?? "").trim();

  const parsedPrice = Number(normalizedPrice);

  const parsedCostPrice =
    normalizedCostPrice === null
      ? null
      : Number(normalizedCostPrice);

  const parsedStock = Number(normalizedStock);

  if (
    normalizedPrice === "" ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0
  ) {
    throw new Error("INVALID_PRODUCT_PRICE");
  }

  if (
    parsedCostPrice !== null &&
    (
      !Number.isFinite(parsedCostPrice) ||
      parsedCostPrice < 0
    )
  ) {
    throw new Error("INVALID_PRODUCT_COST_PRICE");
  }

  if (
    normalizedStock === "" ||
    !Number.isInteger(parsedStock) ||
    parsedStock < 0
  ) {
    throw new Error("INVALID_PRODUCT_STOCK");
  }

  return {
    price: parsedPrice,
    costPrice: normalizedCostPrice,
    stock: parsedStock
  };
}

// ======================
// LISTAR PRODUTOS
// ======================
router.get("/", async (req, res) => {

  const products = await prisma.product.findMany({
    include: { images: true }
  });

  res.render("products", {
    products,
    query: req.query
  });

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
router.post(
  "/create",
  upload.single("image"),
  csrfSynchronisedProtection,
  async (req, res) => {

  try {

    const {
      name,
      description,
      price,
      costPrice,
      stock,
      tenantId
      } = req.body;

      const productNumbers = parseProductNumbers({
        price,
        costPrice,
        stock
      });

      const product = await prisma.product.create({

        data: {
          name,
          description,
          price: productNumbers.price,
          costPrice: productNumbers.costPrice,
          stock: productNumbers.stock,
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

    const validationError =
      getProductValidationError(error);

    if (validationError) {
      return res.redirect(
        `/products?error=${validationError}`
      );
    }

    console.error("Erro ao criar produto:", error);

    return res.status(500).send(
      "Erro interno ao criar produto"
    );

  }

});

// EDIT FORM
router.get("/edit/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { images: true }
  });

  const tenants = await prisma.tenant.findMany();

  res.render("product-form", {
    product,
    tenants
  });
});

// UPDATE
router.post(
  "/update/:id",
  upload.single("image"),
  csrfSynchronisedProtection,
  async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      costPrice,
      stock,
      tenantId
    } = req.body;

    const productNumbers = parseProductNumbers({
      price,
      costPrice,
      stock
    });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: productNumbers.price,
        costPrice: productNumbers.costPrice,
        stock: productNumbers.stock,
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

      const validationError =
        getProductValidationError(error);

      if (validationError) {
        return res.redirect(
          `/products?error=${validationError}`
        );
      }

      console.error(
        "Erro ao atualizar produto:",
        error
      );

      return res.status(500).send(
        "Erro interno ao atualizar produto"
      );

    }
});

// REATIVAR
router.post(
  "/activate/:id",
  csrfSynchronisedProtection,
  async (req, res, next) => {

    try {

      const product = await prisma.product.findUnique({
        where: {
          id: req.params.id
        },
        select: {
          id: true
        }
      });

      if (!product) {
        return res.redirect(
          "/products?error=product_not_found"
        );
      }

      await prisma.product.update({
        where: {
          id: product.id
        },
        data: {
          active: true
        }
      });

      return res.redirect(
        "/products?success=product_activated"
      );

    } catch (error) {

      console.error(
        "Erro ao reativar produto:",
        error
      );

      return next(error);
    }
  }
);

// DELETE
router.post(
  "/delete/:id",
  csrfSynchronisedProtection,
  async (req, res, next) => {

    try {

      const productId = req.params.id;

      const product = await prisma.product.findUnique({
        where: {
          id: productId
        },
        select: {
          id: true,
          active: true,
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
              images: true
            }
          }
        }
      });

      if (!product) {
        return res.redirect(
          "/products?error=product_not_found"
        );
      }

      /*
       * Produtos presentes em pedidos fazem parte
       * do histórico comercial e não podem ser
       * removidos fisicamente.
       */
      if (product._count.orderItems > 0) {

        await prisma.$transaction([
          prisma.cartItem.deleteMany({
            where: {
              productId
            }
          }),

          prisma.product.update({
            where: {
              id: productId
            },
            data: {
              active: false
            }
          })
        ]);

        return res.redirect(
          "/products?success=product_deactivated"
        );
      }

      /*
       * Sem histórico de pedidos, as referências
       * transitórias e imagens podem ser removidas
       * junto com o produto.
       */
      await prisma.$transaction([
        prisma.cartItem.deleteMany({
          where: {
            productId
          }
        }),

        prisma.productImage.deleteMany({
          where: {
            productId
          }
        }),

        prisma.product.delete({
          where: {
            id: productId
          }
        })
      ]);

      return res.redirect(
        "/products?success=product_deleted"
      );

    } catch (error) {

      console.error(
        "Erro ao excluir produto:",
        error
      );

      return next(error);
    }
  }
);

module.exports = router;
