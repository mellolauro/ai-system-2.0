const express = require("express");
const router = express.Router();
const prisma = require("../prisma");


// ==========================
// LISTAR USUÁRIOS
// ==========================
router.get("/", async (req, res) => {

  const users = await prisma.user.findMany({
    include: {
      tenant: true
    }
  });

  res.render("users", {
    users
  });

});


// ==========================
// NOVO USUÁRIO
// ==========================
router.get("/new", async (req, res) => {

  const tenants = await prisma.tenant.findMany();

  res.render("user-form", {
    tenants
  });

});


// ==========================
// CRIAR USUÁRIO
// ==========================
router.post("/create", async (req, res) => {

  const { name, email, telegramId, tenantId } = req.body;

  await prisma.user.create({
    data: {
      name,
      email,
      telegramId,
      tenantId
    }
  });

  res.redirect("/users");

});


// ==========================
// EDITAR
// ==========================
router.get("/edit/:id", async (req, res) => {

  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  const tenants = await prisma.tenant.findMany();

  res.render("user-form", {
    user,
    tenants
  });

});


// ==========================
// UPDATE
// ==========================
router.post("/update/:id", async (req, res) => {

  const { name, email, telegramId, tenantId } = req.body;

  await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name,
      email,
      telegramId,
      tenantId
    }
  });

  res.redirect("/users");

});


// ==========================
// DELETE
// ==========================
router.get("/delete/:id", async (req, res) => {

  await prisma.user.delete({
    where: { id: req.params.id }
  });

  res.redirect("/users");

});


module.exports = router;
