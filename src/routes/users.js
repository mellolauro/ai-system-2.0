const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// ==========================
// LISTAR USUÁRIOS
// ==========================
router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tenant: true,
        _count: {
          select: { orders: true, memories: true, conversations: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.render("users", { users });
  } catch (err) {
    next(err);
  }
});

// ==========================
// FORMULÁRIO: NOVO USUÁRIO
// ==========================
router.get("/new", async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany();

    res.render("user-form", {
      user: null,
      tenants
    });
  } catch (err) {
    next(err);
  }
});

// ==========================
// CRIAR USUÁRIO (POST)
// ==========================
router.post("/create", async (req, res, next) => {
  try {
    const { name, email, phone, telegramId, role, tenantId, avatarUrl } = req.body;

    await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        telegramId: telegramId || null,
        role: role || "USER",
        tenantId: tenantId || null,
        avatarUrl: avatarUrl || null
      }
    });

    res.redirect("/users");
  } catch (err) {
    next(err);
  }
});

// ==========================
// FORMULÁRIO: EDITAR USUÁRIO
// ==========================
router.get("/edit/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    const tenants = await prisma.tenant.findMany();

    res.render("user-form", {
      user,
      tenants
    });
  } catch (err) {
    next(err);
  }
});

// ==========================
// ATUALIZAR USUÁRIO (POST)
// ==========================
router.post("/update/:id", async (req, res, next) => {
  try {
    const { name, email, phone, telegramId, role, tenantId, avatarUrl } = req.body;

    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        telegramId: telegramId || null,
        role: role || "USER",
        tenantId: tenantId || null,
        avatarUrl: avatarUrl || null
      }
    });

    res.redirect("/users");
  } catch (err) {
    next(err);
  }
});

// ==========================
// DELETAR USUÁRIO
// ==========================
router.get("/delete/:id", async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.redirect("/users");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
