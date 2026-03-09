require("dotenv").config();
const express = require("express");
const path = require("path");
const prisma = require("./prisma");
const { initTelegram } = require("./channels/telegram");
const expressLayouts = require("express-ejs-layouts");

// ========================
// ROTAS
// ========================
const dashboardRouter = require("./routes/dashboard");
const productRoutes = require("./routes/products");
const tenantRoutes = require("./routes/tenants");
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");
const orderRoutes = require("./routes/orders");
// const whatsappRoutes = require("./routes/whatsapp"); // Se for incluir o que criamos

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
// STATIC FILES (Ubuntu Path Fix)
// ========================
// Serve arquivos gerais (css, js do frontend)
app.use(express.static(path.join(__dirname, "public")));
// Serve os uploads de imagens
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ========================
// REDIRECT RAIZ
// ========================
app.get("/", (req, res) => res.redirect("/dashboard"));

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
// APP ROUTES
// ========================
app.use("/dashboard", dashboardRouter);
app.use("/products", productRoutes);
app.use("/tenants", tenantRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
// app.use("/whatsapp", whatsappRoutes); // Ative quando criar o arquivo

// API ROUTES
app.use("/api/chat", chatRoutes);

// ========================
// ERRO GLOBAL (Melhorado)
// ========================
app.use((err, req, res, next) => {
  console.error("❌ Erro não tratado:", err.stack); // stack ajuda a debugar no Ubuntu
  res.status(500).render("error", { error: "Erro interno no servidor" }); // Melhor renderizar uma página de erro
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

    // Inicia Bot do Telegram
    try {
      initTelegram();
      console.log("📲 Telegram ativo (multi-tenant + multi-agent)");
    } catch (teleErr) {
      console.error("⚠️ Falha ao iniciar Telegram:", teleErr.message);
    }

    // GRACEFUL SHUTDOWN
    process.on("SIGINT", async () => {
      console.log("\n🛑 Encerrando aplicação...");
      await prisma.$disconnect();
      server.close(() => {
        console.log("👋 Servidor encerrado.");
        process.exit(0);
      });
    });

  } catch (err) {
    console.error("💥 Erro crítico ao iniciar servidor:", err);
    process.exit(1);
  }
};

startServer();
