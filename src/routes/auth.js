const express = require("express");
const bcrypt = require("bcrypt");
const { rateLimit } = require("express-rate-limit");

const {
    csrfSynchronisedProtection,
    exposeCsrfToken
} = require("../middleware/csrf");

const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

/*
 * ============================================================
 * LOGIN RATE LIMIT
 * ============================================================
 */

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    skipSuccessfulRequests: true,

    message: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente."
});

/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

router.get(
    "/login",
    exposeCsrfToken,
    (req, res) => {
        if (
            req.session &&
            req.session.authenticated
        ) {
            return res.redirect("/dashboard");
        }

        return res.render(
            "login",
            {
                layout: false,
                error: null
            }
        );
    }
);

router.post(
    "/login",
    exposeCsrfToken,
    loginLimiter,
    csrfSynchronisedProtection,
    async (req, res, next) => {
        const {
            username,
            password
        } = req.body;

        try {
            const validUser =
                username === process.env.ADMIN_USER;

            if (!process.env.ADMIN_TENANT_ID) {
                throw new Error(
                    "ADMIN_TENANT_ID não configurado."
                );
            }

            const adminUser =
                await prisma.user.findFirst({
                    where: {
                        tenantId:
                            process.env.ADMIN_TENANT_ID,

                        role:
                            "ADMIN"
                    },

                    select: {
                        id: true,
                        tenantId: true,
                        passwordHash: true
                    }
                });

            if (
                !adminUser ||
                !adminUser.passwordHash
            ) {
                throw new Error(
                    "Credencial administrativa não configurada no banco de dados."
                );
            }

            const validPassword =
                typeof password === "string" &&
                await bcrypt.compare(
                    password,
                    adminUser.passwordHash
                );

            if (
                !validUser ||
                !validPassword
            ) {
                return res.status(401).render(
                    "login",
                    {
                        layout: false,
                        error: "Usuário ou senha inválidos."
                    }
                );
            }

            req.session.regenerate(
                err => {
                    if (err) {
                        return next(err);
                    }

                    req.session.authenticated = true;
                    req.session.username = username;
                    req.session.userId = adminUser.id;
                    req.session.tenantId = adminUser.tenantId;

                    req.session.save(
                        err => {
                            if (err) {
                                return next(err);
                            }

                            return res.redirect(
                                "/dashboard"
                            );
                        }
                    );
                }
            );
        } catch (err) {
            return next(err);
        }
    }
);

/*
 * ============================================================
 * CHANGE PASSWORD
 * ============================================================
 */

const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message:
        "Muitas tentativas de alteração de senha. Aguarde 15 minutos e tente novamente."
});

function renderChangePassword(
    req,
    res,
    {
        status = 200,
        error = null,
        success = null
    } = {}
) {
    return res.status(status).render(
        "change-password",
        {
            layout: false,
            error,
            success
        }
    );
}

router.get(
    "/change-password",
    requireAuth,
    exposeCsrfToken,
    (req, res) => {
        return renderChangePassword(
            req,
            res
        );
    }
);

router.post(
    "/change-password",
    requireAuth,
    exposeCsrfToken,
    changePasswordLimiter,
    csrfSynchronisedProtection,
    async (req, res, next) => {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        try {
            if (
                typeof currentPassword !== "string" ||
                typeof newPassword !== "string" ||
                typeof confirmPassword !== "string"
            ) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "Preencha todos os campos."
                    }
                );
            }

            if (
                newPassword !==
                confirmPassword
            ) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "A confirmação da nova senha não confere."
                    }
                );
            }

            if (newPassword.length < 12) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "A nova senha deve ter pelo menos 12 caracteres."
                    }
                );
            }

            /*
             * bcrypt considera no máximo 72 bytes da senha.
             * Rejeitamos valores maiores para evitar truncamento
             * silencioso.
             */
            if (
                Buffer.byteLength(
                    newPassword,
                    "utf8"
                ) > 72
            ) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "A nova senha excede o limite permitido."
                    }
                );
            }

            const adminUser =
                await prisma.user.findFirst({
                    where: {
                        id:
                            req.session.userId,

                        tenantId:
                            req.session.tenantId,

                        role:
                            "ADMIN"
                    },

                    select: {
                        id: true,
                        passwordHash: true
                    }
                });

            if (
                !adminUser ||
                !adminUser.passwordHash
            ) {
                throw new Error(
                    "Credencial administrativa não encontrada."
                );
            }

            const currentPasswordValid =
                await bcrypt.compare(
                    currentPassword,
                    adminUser.passwordHash
                );

            if (!currentPasswordValid) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "A senha atual está incorreta."
                    }
                );
            }

            const samePassword =
                await bcrypt.compare(
                    newPassword,
                    adminUser.passwordHash
                );

            if (samePassword) {
                return renderChangePassword(
                    req,
                    res,
                    {
                        status: 400,
                        error:
                            "A nova senha deve ser diferente da senha atual."
                    }
                );
            }

            const newPasswordHash =
                await bcrypt.hash(
                    newPassword,
                    12
                );

            await prisma.$transaction(
                async tx => {
                    await tx.user.update({
                        where: {
                            id:
                                adminUser.id
                        },

                        data: {
                            passwordHash:
                                newPasswordHash,

                            passwordChangedAt:
                                new Date()
                        }
                    });

                    /*
                     * Invalida todas as outras sessões
                     * autenticadas deste administrador.
                     *
                     * A sessão que realizou a troca é
                     * preservada.
                     */
                    await tx.$executeRaw`
                        DELETE FROM "session"
                        WHERE sess ->> 'userId' =
                              ${adminUser.id}
                          AND sid <>
                              ${req.sessionID}
                    `;
                }
            );

            return renderChangePassword(
                req,
                res,
                {
                    success:
                        "Senha alterada com sucesso."
                }
            );
        } catch (err) {
            return next(err);
        }
    }
);

/*
 * ============================================================
 * LOGOUT
 * ============================================================
 */

router.post(
    "/logout",
    (req, res, next) => {
        req.session.destroy(
            err => {
                if (err) {
                    return next(err);
                }

                res.clearCookie(
                    "ai_system_session"
                );

                return res.redirect(
                    "/login"
                );
            }
        );
    }
);

module.exports = router;
