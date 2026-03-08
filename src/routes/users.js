const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// LISTAR USUÁRIOS
router.get("/", async (req, res) => {

  const users = await prisma.user.findMany();

  res.render("users", {
    users
  });

});

// NOVO USUÁRIO
router.get("/new", (req, res) => {

  res.render("user-form", {
    user: null
  });

});

// CRIAR
router.post("/create", async (req, res) => {

  const { name, email } = req.body;

  await prisma.user.create({
    data: {
      name,
      email
    }
  });

  res.redirect("/users");

});

// EDITAR
router.get("/edit/:id", async (req, res) => {

  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  res.render("user-form", {
    user
  });

});

// UPDATE
router.post("/update/:id", async (req, res) => {

  const { name, email } = req.body;

  await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name,
      email
    }
  });

  res.redirect("/users");

});

// DELETE
router.get("/delete/:id", async (req, res) => {

  await prisma.user.delete({
    where: { id: req.params.id }
  });

  res.redirect("/users");

});

module.exports = router;
