const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
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
                error: null,
                success:
                    req.query.passwordReset === "1"
                        ? "Senha redefinida com sucesso. Entre com a nova senha."
                        : null
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
                        error: "Usuário ou senha inválidos.",
                        success: null
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
 * PASSWORD RECOVERY
 * ============================================================
 */

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message:
        "Muitas tentativas de recuperação. Aguarde 15 minutos e tente novamente."
});

function hashResetToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function renderResetPassword(
    res,
    {
        status = 200,
        token = "",
        error = null
    } = {}
) {
    return res.status(status).render(
        "reset-password",
        {
            layout: false,
            token,
            error
        }
    );
}

router.get(
    "/forgot-password",
    (req, res) => {
        return res.render(
            "forgot-password",
            {
                layout: false
            }
        );
    }
);

router.get(
    "/reset-password",
    exposeCsrfToken,
    async (req, res, next) => {
        const token =
            typeof req.query.token === "string"
                ? req.query.token
                : "";

        try {
            if (!token) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        error:
                            "Link de recuperação inválido ou incompleto."
                    }
                );
            }

            const tokenHash =
                hashResetToken(token);

            const resetToken =
                await prisma.passwordResetToken.findUnique({
                    where: {
                        tokenHash
                    },
                    select: {
                        id: true,
                        usedAt: true,
                        expiresAt: true
                    }
                });

            if (
                !resetToken ||
                resetToken.usedAt ||
                resetToken.expiresAt <= new Date()
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        error:
                            "Este link de recuperação é inválido ou expirou."
                    }
                );
            }

            return renderResetPassword(
                res,
                {
                    token
                }
            );
        } catch (err) {
            return next(err);
        }
    }
);

router.post(
    "/reset-password",
    exposeCsrfToken,
    resetPasswordLimiter,
    csrfSynchronisedProtection,
    async (req, res, next) => {
        const {
            token,
            newPassword,
            confirmPassword
        } = req.body;

        try {
            if (
                typeof token !== "string" ||
                typeof newPassword !== "string" ||
                typeof confirmPassword !== "string" ||
                !token
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        token:
                            typeof token === "string"
                                ? token
                                : "",
                        error:
                            "Solicitação de recuperação inválida."
                    }
                );
            }

            if (
                newPassword !==
                confirmPassword
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        token,
                        error:
                            "A confirmação da nova senha não confere."
                    }
                );
            }

            if (newPassword.length < 12) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        token,
                        error:
                            "A nova senha deve ter pelo menos 12 caracteres."
                    }
                );
            }

            if (
                Buffer.byteLength(
                    newPassword,
                    "utf8"
                ) > 72
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        token,
                        error:
                            "A nova senha excede o limite permitido."
                    }
                );
            }

            const tokenHash =
                hashResetToken(token);

            const resetToken =
                await prisma.passwordResetToken.findUnique({
                    where: {
                        tokenHash
                    },
                    select: {
                        id: true,
                        userId: true,
                        usedAt: true,
                        expiresAt: true,
                        user: {
                            select: {
                                id: true,
                                role: true,
                                tenantId: true,
                                passwordHash: true
                            }
                        }
                    }
                });

            if (
                !resetToken ||
                resetToken.usedAt ||
                resetToken.expiresAt <= new Date() ||
                !resetToken.user ||
                resetToken.user.role !== "ADMIN" ||
                resetToken.user.tenantId !==
                    process.env.ADMIN_TENANT_ID
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        error:
                            "Este link de recuperação é inválido ou expirou."
                    }
                );
            }

            if (
                resetToken.user.passwordHash &&
                await bcrypt.compare(
                    newPassword,
                    resetToken.user.passwordHash
                )
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        token,
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

            const now = new Date();

            await prisma.$transaction(
                async tx => {
                    const consumed =
                        await tx.passwordResetToken.updateMany({
                            where: {
                                id:
                                    resetToken.id,
                                userId:
                                    resetToken.userId,
                                usedAt:
                                    null,
                                expiresAt: {
                                    gt: now
                                }
                            },
                            data: {
                                usedAt: now
                            }
                        });

                    if (consumed.count !== 1) {
                        throw new Error(
                            "RESET_TOKEN_ALREADY_CONSUMED"
                        );
                    }

                    await tx.user.update({
                        where: {
                            id:
                                resetToken.user.id
                        },
                        data: {
                            passwordHash:
                                newPasswordHash,
                            passwordChangedAt:
                                now
                        }
                    });

                    await tx.passwordResetToken.updateMany({
                        where: {
                            userId:
                                resetToken.user.id,
                            usedAt:
                                null
                        },
                        data: {
                            usedAt:
                                now
                        }
                    });

                    await tx.$executeRaw`
                        DELETE FROM "session"
                        WHERE sess ->> 'userId' =
                              ${resetToken.user.id}
                    `;
                }
            );

            return res.redirect(
                "/login?passwordReset=1"
            );
        } catch (err) {
            if (
                err.message ===
                "RESET_TOKEN_ALREADY_CONSUMED"
            ) {
                return renderResetPassword(
                    res,
                    {
                        status: 400,
                        error:
                            "Este link de recuperação já foi utilizado."
                    }
                );
            }

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
