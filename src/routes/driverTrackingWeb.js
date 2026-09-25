const crypto = require("crypto");
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  createTrackingSession,
  inspectActivationInvite,
  consumeActivationInvite,
  setSessionCookie
} = require("../controllers/driverTrackingController");

const router = express.Router();

const ACTIVATION_CSRF_COOKIE =
  "driver_activation_csrf";

const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

function getCookie(req, name) {
  const header = req.get("Cookie") || "";

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key =
      part.slice(0, separator).trim();

    if (key !== name) {
      continue;
    }

    const value =
      part.slice(separator + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return "";
    }
  }

  return "";
}

function safeEqual(left, right) {
  const a = Buffer.from(
    String(left || "")
  );

  const b = Buffer.from(
    String(right || "")
  );

  if (
    a.length === 0 ||
    a.length !== b.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function createActivationCsrf(res) {
  const token =
    crypto.randomBytes(32).toString("hex");

  res.cookie(
    ACTIVATION_CSRF_COOKIE,
    token,
    {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/driver/tracking",
      maxAge: 15 * 60 * 1000
    }
  );

  return token;
}

function clearActivationCsrf(res) {
  res.clearCookie(
    ACTIVATION_CSRF_COOKIE,
    {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/driver/tracking"
    }
  );
}

/*
 * ============================================================
 * DRIVER TRACKING WEB
 * ============================================================
 */

/*
 * ============================================================
 * CONVITE DE ATIVAÇÃO
 * ============================================================
 */

function setActivationSecurityHeaders(res) {
  res.set(
    "Referrer-Policy",
    "no-referrer"
  );

  res.set(
    "Cache-Control",
    "no-store"
  );
}


router.get(
  "/invite",
  activationLimiter,
  (req, res) => {

    setActivationSecurityHeaders(res);

    if (!req.secure) {
      return res.status(403).send(
        "A ativação do dispositivo exige uma conexão HTTPS segura."
      );
    }

    const csrfToken =
      createActivationCsrf(res);

    return res.render(
      "driver-activation",
      {
        layout: false,
        csrfToken
      }
    );
  }
);


router.post(
  "/invite/inspect",
  activationLimiter,
  async (req, res) => {

    setActivationSecurityHeaders(res);

    if (!req.secure) {
      return res.status(403).json({
        success: false,
        error:
          "A ativação do dispositivo exige uma conexão HTTPS segura."
      });
    }

    const csrfCookie =
      getCookie(
        req,
        ACTIVATION_CSRF_COOKIE
      );

    const csrfHeader =
      String(
        req.get("X-Activation-CSRF") || ""
      );

    if (!safeEqual(csrfCookie, csrfHeader)) {
      return res.status(403).json({
        success: false,
        error:
          "Sessão de ativação inválida. Abra novamente o convite."
      });
    }

    try {
      const result =
        await inspectActivationInvite(
          req.body?.token
        );

      if (!result.success) {
        return res
          .status(result.status)
          .json({
            success: false,
            error:
              result.error
          });
      }

      return res.status(200).json({
        success: true,
        driver: {
          name:
            result.driver.name
        },
        expiresAt:
          result.expiresAt
      });

    } catch (error) {
      console.error(
        "Erro ao validar convite de ativação:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Erro interno ao validar o convite."
      });
    }
  }
);


router.post(
  "/invite/activate",
  activationLimiter,
  async (req, res) => {

    setActivationSecurityHeaders(res);

    if (!req.secure) {
      return res.status(403).json({
        success: false,
        error:
          "A ativação do dispositivo exige uma conexão HTTPS segura."
      });
    }

    const csrfCookie =
      getCookie(
        req,
        ACTIVATION_CSRF_COOKIE
      );

    const csrfHeader =
      String(
        req.get("X-Activation-CSRF") || ""
      );

    if (!safeEqual(csrfCookie, csrfHeader)) {
      return res.status(403).json({
        success: false,
        error:
          "Sessão de ativação inválida. Abra novamente o convite."
      });
    }

    try {
      const result =
        await consumeActivationInvite(
          req.body?.token
        );

      if (!result.success) {
        clearActivationCsrf(res);

        return res
          .status(result.status)
          .json({
            success: false,
            error:
              result.error
          });
      }

      setSessionCookie(
        res,
        result.sessionToken,
        result.expiresAt
      );

      clearActivationCsrf(res);

      return res.status(200).json({
        success: true,
        redirect:
          "/driver/tracking"
      });

    } catch (error) {
      console.error(
        "Erro ao consumir convite de ativação:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Erro interno ao ativar o dispositivo."
      });
    }
  }
);


router.get("/", (req, res) => {
  const csrfToken =
    createActivationCsrf(res);

  res.render("driver-tracking", {
    layout: false,
    csrfToken,
    activationError: null
  });
});

router.post(
  "/activate",
  activationLimiter,
  async (req, res) => {
    if (!req.secure) {
      const csrfToken =
        createActivationCsrf(res);

      return res.status(403).render(
        "driver-tracking",
        {
          layout: false,
          csrfToken,
          activationError:
            "A ativação do dispositivo exige uma conexão HTTPS segura."
        }
      );
    }

    const csrfCookie =
      getCookie(
        req,
        ACTIVATION_CSRF_COOKIE
      );

    const csrfForm =
      String(req.body?._csrf || "");

    if (!safeEqual(csrfCookie, csrfForm)) {
      const csrfToken =
        createActivationCsrf(res);

      return res.status(403).render(
        "driver-tracking",
        {
          layout: false,
          csrfToken,
          activationError:
            "Sessão de ativação inválida. Tente novamente."
        }
      );
    }

    try {
      const result =
        await createTrackingSession(
          req.body?.token
        );

      if (!result.success) {
        const csrfToken =
          createActivationCsrf(res);

        return res
          .status(result.status)
          .render(
            "driver-tracking",
            {
              layout: false,
              csrfToken,
              activationError:
                result.error
            }
          );
      }

      setSessionCookie(
        res,
        result.sessionToken,
        result.expiresAt
      );

      clearActivationCsrf(res);

      return res.redirect(
        "/driver/tracking"
      );
    } catch (error) {
      console.error(
        "Erro na ativação web do rastreamento:",
        error
      );

      const csrfToken =
        createActivationCsrf(res);

      return res.status(500).render(
        "driver-tracking",
        {
          layout: false,
          csrfToken,
          activationError:
            "Erro interno ao ativar o dispositivo."
        }
      );
    }
  }
);

module.exports = router;
