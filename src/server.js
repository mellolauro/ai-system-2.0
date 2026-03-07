require("dotenv").config();

const express = require("express");
const path = require("path");

const prisma = require("./prisma");
const { initTelegram } = require("./channels/telegram");
const expressLayouts = require("express-ejs-layouts");

// ========================
// ROTAS
// ========================
const productRoutes = require("./routes/products");
const dashboardRouter = require("./routes/dashboard");
const chatRoutes = require("./routes/chat");

const app = express();

// ========================
// MIDDLEWARES
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// VIEW ENGINE
// ========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", "layout");

// ========================
// STATIC FILES
// ========================
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// ========================
// HEALTH CHECK
// ========================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AI-System 2.0",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// ========================
// CHATBOT API
// ========================
app.use("/api/chat", chatRoutes);

// ========================
// DASHBOARD
// ========================
app.use("/dashboard", dashboardRouter);

// ========================
// PRODUTOS
// ========================
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

const startServer = async () => {

  try {

    await prisma.$connect();
    console.log("📦 Prisma conectado com sucesso");

    const server = app.listen(PORT, () => {
      console.log(`🚀 AI-System 2.0 rodando na porta ${PORT}`);
    });

    initTelegram();
    console.log("📲 Telegram ativo (multi-tenant + multi-agent)");

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

  } catch (err) {

    console.error("Erro ao iniciar serviços:", err);
    process.exit(1);

  }

};

startServer();
