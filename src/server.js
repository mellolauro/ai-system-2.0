require("dotenv").config();

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const os = require("os");
const prisma = require("./prisma");
const bootstrap = require("./bootstrap");

const app = express();

/*
 * Helper para obter o IP de rede dinamicamente
 */
function getNetworkIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

/*
 * ============================================================
 * MIDDLEWARES
 * ============================================================
 */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
 * ============================================================
 * VIEW ENGINE
 * ============================================================
 */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

/*
 * ============================================================
 * STATIC
 * ============================================================
 */

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

/*
 * ============================================================
 * ROUTES
 * ============================================================
 */

app.use("/dashboard", require("./routes/dashboard"));
app.use("/products", require("./routes/products"));
app.use("/tenants", require("./routes/tenants"));
app.use("/users", require("./routes/users"));
app.use("/orders", require("./routes/orders"));
app.use("/api/chat", require("./routes/chat"));

// 📍 Rotas de Entregadores e Rastreio GPS
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/gps", require("./routes/gpsRoutes"));

/*
 * ============================================================
 * WHATSAPP INTERNAL
 * ============================================================
 */

app.use("/internal/whatsapp", require("./routes/whatsapp"));

/*
 * ============================================================
 * ROOT
 * ============================================================
 */

app.get("/", async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            where: { active: true },
            include: { images: true },
            take: 6,
            orderBy: { createdAt: "desc" }
        });

        res.render("landing", {
            layout: false,
            products
        });
    } catch (err) {
        next(err);
    }
});

/*
 * ============================================================
 * HEALTH
 * ============================================================
 */

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "AI-System 2.0",
        version: "1.0.0",
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

/*
 * ============================================================
 * ERROR HANDLER
 * ============================================================
 */

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: err.message
    });
});

/*
 * ============================================================
 * START
 * ============================================================
 */

const PORT = process.env.PORT || 3000;
const HOST_IP = process.env.HOST_IP || getNetworkIp();

async function start() {
    try {
        console.log("");
        console.log("======================================");
        console.log(" AI-System 2.0");
        console.log("======================================");

        if (!process.env.AI_SYSTEM_INTERNAL_TOKEN) {
            console.warn("⚠️ AI_SYSTEM_INTERNAL_TOKEN não configurado.");
        } else {
            console.log("✓ Token interno configurado");
        }

        await prisma.$connect();
        console.log("✓ Banco conectado");

        await bootstrap();
        console.log("✓ Framework carregado");

        app.listen(PORT, "0.0.0.0", () => {
            console.log("");
            console.log(`🚀 HTTP Server iniciado na porta ${PORT}`);
            console.log(`🚀 Acesso Local: http://localhost:${PORT}`);
            console.log(`🚀 Acesso via Rede: http://${HOST_IP}:${PORT}`);
            console.log("");
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();

/*
 * ============================================================
 * SHUTDOWN
 * ============================================================
 */

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
    console.log("");
    console.log("Encerrando aplicação...");

    try {
        await prisma.$disconnect();
        console.log("✓ Banco desconectado");
    } catch (error) {
        console.error("Erro ao desconectar banco:", error.message);
    }

    process.exit(0);
}
