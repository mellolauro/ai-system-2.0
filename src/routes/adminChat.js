const express =
    require("express");

const MessageController =
    require("../controllers/MessageController");

const requireAuth =
    require("../middleware/requireAuth");

const {
    csrfSynchronisedProtection
} = require("../middleware/csrf");

const router =
    express.Router();

router.post(
    "/",
    requireAuth,
    csrfSynchronisedProtection,
    async (req, res) => {
        try {
            if (
                !req.session.userId ||
                !req.session.tenantId
            ) {
                return res.status(401).json({
                    success: false,
                    error:
                        "Sessão administrativa inválida."
                });
            }

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

                    message:
                        req.body.message.trim()
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
