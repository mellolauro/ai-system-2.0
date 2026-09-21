const express =
    require("express");

const {
    rateLimit
} = require("express-rate-limit");

const MessageController =
    require("../controllers/MessageController");

const requireAuth =
    require("../middleware/requireAuth");

const {
    csrfSynchronisedProtection
} = require("../middleware/csrf");

const router =
    express.Router();

const MAX_MESSAGE_LENGTH =
    2000;

function requireAdminSessionIdentity(
    req,
    res,
    next
) {
    if (
        !req.session?.userId ||
        !req.session?.tenantId
    ) {
        return res.status(401).json({
            success: false,
            error:
                "Sessão administrativa inválida."
        });
    }

    return next();
}

const adminChatLimiter =
    rateLimit({
        windowMs:
            5 * 60 * 1000,

        limit:
            20,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        keyGenerator: (req) =>
            req.session.userId,

        message: {
            success: false,
            error:
                "Muitas mensagens enviadas. Aguarde alguns minutos e tente novamente."
        }
    });

router.post(
    "/",
    requireAuth,
    requireAdminSessionIdentity,
    adminChatLimiter,
    csrfSynchronisedProtection,
    async (req, res) => {
        try {
            if (
                typeof req.body.message !== "string" ||
                !req.body.message.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Mensagem é obrigatória."
                });
            }

            const message =
                req.body.message.trim();

            if (
                Array.from(message).length >
                MAX_MESSAGE_LENGTH
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        `Mensagem deve possuir no máximo ${MAX_MESSAGE_LENGTH} caracteres.`
                });
            }

            const result =
                await MessageController.process({
                    tenantId:
                        req.session.tenantId,

                    userId:
                        req.session.userId,

                    channel:
                        "admin-web",

                    externalUserId:
                        req.session.userId,

                    agentContext:
                        "admin",

                    message
                });

            return res.json({
                success: true,
                data: result
            });

        } catch (err) {
            console.error(
                "Erro no chat administrativo:",
                err
            );

            return res.status(500).json({
                success: false,
                error:
                    "Erro interno ao processar a mensagem."
            });
        }
    }
);

module.exports =
    router;
