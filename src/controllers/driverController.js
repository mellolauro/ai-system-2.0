const crypto = require("crypto");

const prisma = require("../prisma");

const {
  updateDriverLocation
} = require("../tools/deliveryTools");

const DRIVER_SESSION_COOKIE =
  "driver_tracking_session";

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

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

async function authenticateTracking(req) {
  const authorization =
    req.get("Authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    const token =
      authorization.slice(7).trim();

    if (!token) {
      return null;
    }

    return {
      trackingTokenHash:
        hashToken(token),
      sessionId: null,
      authType: "bearer"
    };
  }

  const sessionToken =
    getCookie(
      req,
      DRIVER_SESSION_COOKIE
    );

  if (!sessionToken) {
    return null;
  }

  const now = new Date();

  const session =
    await prisma.driverTrackingSession.findUnique({
      where: {
        tokenHash:
          hashToken(sessionToken)
      },
      include: {
        device: {
          include: {
            driver: true
          }
        }
      }
    });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    !session.device ||
    !session.device.active ||
    session.device.revokedAt ||
    !session.device.driver ||
    !session.device.driver.active
  ) {
    return null;
  }

  return {
    trackingTokenHash:
      session.device.tokenHash,
    sessionId: session.id,
    authType: "session"
  };
}

/**
 * Controller para atualização autenticada da localização
 * do entregador em tempo real.
 */
async function updateLocation(req, res) {
  try {
    const auth =
      await authenticateTracking(req);

    if (!auth) {
      return res.status(401).json({
        success: false,
        error:
          "Credencial de rastreamento inválida."
      });
    }

    if (
      auth.authType === "session" &&
      req.get("X-Driver-Tracking") !== "1"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Requisição de rastreamento inválida."
      });
    }

    const {
      latitude,
      longitude
    } = req.body || {};

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Os campos 'latitude' e 'longitude' são obrigatórios."
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Coordenadas de latitude e longitude inválidas."
      });
    }

    const result =
      await updateDriverLocation({
        trackingTokenHash:
          auth.trackingTokenHash,
        latitude: lat,
        longitude: lng
      });

    if (!result.success) {
      const status =
        result.code ===
        "INVALID_TRACKING_TOKEN"
          ? 401
          : 400;

      return res.status(status).json({
        success: false,
        error:
          result.message ||
          "Não foi possível atualizar a localização."
      });
    }

    if (auth.sessionId) {
      try {
        await prisma.driverTrackingSession.update({
          where: {
            id: auth.sessionId
          },
          data: {
            lastSeenAt: new Date()
          }
        });
      } catch (error) {
        console.error(
          "Erro ao atualizar atividade da sessão de rastreamento:",
          error
        );
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Erro no driverController.updateLocation:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao atualizar a localização do entregador."
    });
  }
}

module.exports = {
  updateLocation
};
