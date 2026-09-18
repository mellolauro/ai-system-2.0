const express = require("express");

const router = express.Router();

/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

router.get(
    "/login",
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
    (req, res, next) => {
        const {
            username,
            password
        } = req.body;

        const validUser =
            username === process.env.ADMIN_USER;

        const validPassword =
            password === process.env.ADMIN_PASSWORD;

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
