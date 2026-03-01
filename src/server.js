require("dotenv").config();
const express = require("express");
const prisma = require("./prisma"); // ajuste se necessário
const { initTelegram } = require("./channels/telegram");
const productRoutes = require("./routes/products");

const app = express(); // ⚠️ precisa vir antes de usar app

// ========================
// MIDDLEWARES
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// ROTAS
// ========================

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AI-System 2.0",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Rotas de produtos
app.use("/products", productRoutes);

// ========================
// TENANTS (Base SaaS)
// ========================

app.get("/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { users: true }
    });

    res.json(tenants);
  } catch (error) {
    console.error("Erro ao buscar tenants:", error);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/tenants", async (req, res) => {
  try {
    const { name, plan, agentName } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        plan: plan || "free",
        agentName: agentName || "main"
      }
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ========================
// ERRO GLOBAL
// ========================
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro inesperado no servidor" });
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 AI-System 2.0 rodando na porta ${PORT}`);

  try {
    await prisma.$connect();
    console.log("📦 Prisma conectado com sucesso");

    initTelegram();
  } catch (err) {
    console.error("Erro ao iniciar serviços:", err);
  }
});

// ========================
// GRACEFUL SHUTDOWN
// ========================
process.on("SIGINT", async () => {
  console.log("Encerrando aplicação...");
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});
