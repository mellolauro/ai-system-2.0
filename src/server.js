require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const pgSession = require("connect-pg-simple")(session);
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const os = require("os");

const prisma = require("./prisma");
const bootstrap = require("./bootstrap");
const requireAuth = require("./middleware/requireAuth");

const {
    csrfSynchronisedProtection,
    exposeCsrfToken
} = require("./middleware/csrf");

const {
    initTelegram,
    stopTelegram
} = require("./channels/telegram");

const app = express();

/*
 * Helper para obter o IP de rede dinamicamente
 */
function getNetworkIp() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (
                iface.family === "IPv4" &&
                !iface.internal
            ) {
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

app.use(
    express.urlencoded({
        extended: true
    })
);

/*
 * ============================================================
 * SESSION
 * ============================================================
 */

/*
 * O AI-System recebe conexões HTTPS através do
 * Tailscale Funnel, que atua como reverse proxy.
 *
 * Necessário para que o Express reconheça corretamente
 * o protocolo original da requisição.
 */
app.set("trust proxy", 1);

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET não configurado.");
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurado.");
}

const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sessionStore = new pgSession({
    pool: sessionPool,
    tableName: "session",
    createTableIfMissing: false
});

app.use(
    session({
        name: "ai_system_session",

        store: sessionStore,

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: "auto",
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);

/*
 * ============================================================
 * VIEW ENGINE
 * ============================================================
 */

app.set(
    "view engine",
    "ejs"
);

app.set(
    "views",
    path.join(
        __dirname,
        "views"
    )
);

app.use(
    expressLayouts
);

app.set(
    "layout",
    "layout"
);

/*
 * ============================================================
 * STATIC
 * ============================================================
 */

app.use(
    express.static(
        path.join(
            __dirname,
            "../public"
        )
    )
);

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "../public/uploads"
        )
    )
);

/*
 * ============================================================
 * AUTH
 * ============================================================
 */

app.use(
    require("./routes/auth")
);

/*
 * ============================================================
 * ROUTES
 * ============================================================
 */

app.use(
    "/dashboard",
    requireAuth,
    exposeCsrfToken,
    csrfSynchronisedProtection,
    require("./routes/dashboard")
);

app.use(
    "/products",
    requireAuth,
    exposeCsrfToken,
    require("./routes/products")
);

app.use(
    "/tenants",
    requireAuth,
    exposeCsrfToken,
    csrfSynchronisedProtection,
    require("./routes/tenants")
);

app.use(
    "/users",
    requireAuth,
    exposeCsrfToken,
    csrfSynchronisedProtection,
    require("./routes/users")
);

app.use(
    "/orders",
    requireAuth,
    exposeCsrfToken,
    csrfSynchronisedProtection,
    require("./routes/orders")
);

app.use(
    "/api/chat",
    require("./routes/chat")
);

// Rotas de Entregadores e Rastreio GPS
app.use(
    "/api/drivers",
    require("./routes/driverRoutes")
);

app.use(
    "/api/gps",
    require("./routes/gpsRoutes")
);

/*
 * ============================================================
 * WHATSAPP INTERNAL
 * ============================================================
 */

app.use(
    "/internal/whatsapp",
    require("./routes/whatsapp")
);

/*
 * ============================================================
 * ROOT
 * ============================================================
 */

app.get(
    "/",
    async (
        req,
        res,
        next
    ) => {
        try {
            const products =
                await prisma.product.findMany({
                    where: {
                        active: true
                    },

                    include: {
                        images: true
                    },

                    take: 6,

                    orderBy: {
                        createdAt: "desc"
                    }
                });

            res.render(
                "landing",
                {
                    layout: false,
                    products
                }
            );
        } catch (err) {
            next(err);
        }
    }
);

/*
 * ============================================================
 * HEALTH
 * ============================================================
 */

app.get(
    "/health",
    (
        req,
        res
    ) => {
        res.json({
            status: "ok",
            service: "AI-System 2.0",
            version: "1.0.0",
            uptime: process.uptime(),
            timestamp:
                new Date()
        });
    }
);

/*
 * ============================================================
 * CSRF ERROR HANDLER
 * ============================================================
 */

app.use(
    (
        err,
        req,
        res,
        next
    ) => {
        if (err.code !== "EBADCSRFTOKEN") {
            return next(err);
        }

        console.warn(
            "Requisição bloqueada por CSRF:",
            req.method,
            req.originalUrl
        );

        return res
            .status(403)
            .json({
                success: false,
                message:
                    "Requisição inválida ou expirada. Atualize a página e tente novamente."
            });
    }
);

/*
 * ============================================================
 * ERROR HANDLER
 * ============================================================
 */

app.use(
    (
        err,
        req,
        res,
        next
    ) => {
        console.error(err);

        res
            .status(500)
            .json({
                success: false,
                message:
                    err.message
            });
    }
);

/*
 * ============================================================
 * START
 * ============================================================
 */

const PORT =
    process.env.PORT ||
    3000;

const HOST_IP =
    process.env.HOST_IP ||
    getNetworkIp();

let httpServer =
    null;

async function start() {
    try {
        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            " AI-System 2.0"
        );

        console.log(
            "======================================"
        );

        if (
            !process.env
                .AI_SYSTEM_INTERNAL_TOKEN
        ) {
            console.warn(
                "⚠️ AI_SYSTEM_INTERNAL_TOKEN não configurado."
            );
        } else {
            console.log(
                "✓ Token interno configurado"
            );
        }

        /*
         * ====================================================
         * DATABASE
         * ====================================================
         */

        await prisma.$connect();

        console.log(
            "✓ Banco conectado"
        );

        /*
         * ====================================================
         * FRAMEWORK / AGENTS
         * ====================================================
         */

        await bootstrap();

        console.log(
            "✓ Framework carregado"
        );

        /*
         * ====================================================
         * TELEGRAM
         * ====================================================
         *
         * O Telegram é consumido diretamente pelo AI-System.
         *
         * OpenClaw NÃO deve iniciar outro polling para o mesmo bot.
         */

        initTelegram();

        /*
         * ====================================================
         * HTTP SERVER
         * ====================================================
         */

        httpServer =
            app.listen(
                PORT,
                "0.0.0.0",
                () => {
                    console.log("");

                    console.log(
                        `🚀 HTTP Server iniciado na porta ${PORT}`
                    );

                    console.log(
                        `🚀 Acesso Local: http://localhost:${PORT}`
                    );

                    console.log(
                        `🚀 Acesso via Rede: http://${HOST_IP}:${PORT}`
                    );

                    console.log("");
                }
            );
    } catch (err) {
        console.error(
            "🔥 Erro ao iniciar AI-System:",
            err
        );

        process.exit(1);
    }
}

start();

/*
 * ============================================================
 * SHUTDOWN
 * ============================================================
 */

let shuttingDown =
    false;

process.on(
    "SIGINT",
    shutdown
);

process.on(
    "SIGTERM",
    shutdown
);

async function shutdown() {
    if (
        shuttingDown
    ) {
        return;
    }

    shuttingDown =
        true;

    console.log("");

    console.log(
        "Encerrando aplicação..."
    );

    /*
     * ========================================================
     * TELEGRAM
     * ========================================================
     */

    try {
        await stopTelegram();

        console.log(
            "✓ Telegram encerrado"
        );
    } catch (error) {
        console.error(
            "Erro ao encerrar Telegram:",
            error.message
        );
    }

    /*
     * ========================================================
     * HTTP
     * ========================================================
     */

    if (
        httpServer
    ) {
        await new Promise(
            resolve => {
                httpServer.close(
                    resolve
                );
            }
        );

        console.log(
            "✓ HTTP Server encerrado"
        );
    }

    /*
     * ========================================================
     * DATABASE
     * ========================================================
     */

    try {
        await prisma.$disconnect();

        console.log(
            "✓ Banco desconectado"
        );
    } catch (error) {
        console.error(
            "Erro ao desconectar banco:",
            error.message
        );
    }

    process.exit(0);
}
