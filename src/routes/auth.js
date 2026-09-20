const express = require("express");
const bcrypt = require("bcrypt");
const { rateLimit } = require("express-rate-limit");

const {
    csrfSynchronisedProtection,
    exposeCsrfToken
} = require("../middleware/csrf");

const prisma = require("../prisma");

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
