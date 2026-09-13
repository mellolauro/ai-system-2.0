 const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

function nullable(value) {

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

// ======================
// LISTAR TENANTS
// ======================
router.get("/", async (req, res) => {

  const tenants = await prisma.tenant.findMany();

  res.render("tenants", {
    tenants
  });

});

// ======================
// FORM NOVO TENANT
// ======================
router.get("/new", (req, res) => {

  res.render("tenant-form", {
    tenant: null
  });

});

// ======================
// CRIAR TENANT
// ======================
router.post("/create", async (req, res) => {

  try {

    const {
      name,
      plan,
      agentName,
      addressLine,
      city,
      state,
      zipCode
    } = req.body;

    await prisma.tenant.create({

      data: {

        name: name.trim(),

        plan,

        agentName:
          agentName?.trim() || "main",

        addressLine:
          nullable(addressLine),

        city:
          nullable(city),

        state:
          nullable(state)?.toUpperCase() || null,

        zipCode:
          nullable(zipCode)

      }

    });

    res.redirect("/tenants");

  } catch (error) {

    console.error(error);

    res
      .status(500)
      .send("Erro ao criar tenant");

  }

});

// ======================
// FORM EDITAR TENANT
// ======================
router.get("/edit/:id", async (req, res) => {

  const tenant =
    await prisma.tenant.findUnique({

      where: {
        id: req.params.id
      }

    });

  res.render("tenant-form", {
    tenant
  });

});

// ======================
// ATUALIZAR TENANT
// ======================
router.post("/update/:id", async (req, res) => {

  try {

    const {
      name,
      plan,
      agentName,
      addressLine,
      city,
      state,
      zipCode
    } = req.body;

    await prisma.tenant.update({

      where: {
        id: req.params.id
      },

      data: {

        name:
          name.trim(),

        plan,

        agentName:
          agentName?.trim() || "main",

        addressLine:
          nullable(addressLine),

        city:
          nullable(city),

        state:
          nullable(state)?.toUpperCase() || null,

        zipCode:
          nullable(zipCode)

      }

    });

    res.redirect("/tenants");

  } catch (error) {

    console.error(error);

    res
      .status(500)
      .send("Erro ao atualizar tenant");

  }

});

// ======================
// DELETAR TENANT
// ======================
router.get("/delete/:id", async (req, res) => {

  await prisma.tenant.delete({

    where: {
      id: req.params.id
    }

  });

  res.redirect("/tenants");

});

module.exports = router;
