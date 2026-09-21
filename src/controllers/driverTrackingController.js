const crypto = require("crypto");

const prisma = require("../prisma");

const DRIVER_SESSION_COOKIE =
  "driver_tracking_session";

const SESSION_DURATION_MS =
  24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function activate(req, res) {
  try {
    const token =
      String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        error:
          "Credencial do dispositivo é obrigatória."
      });
    }

    const device =
      await prisma.driverTrackingDevice.findUnique({
        where: {
          tokenHash: hashToken(token)
        },
        include: {
          driver: true
        }
      });

    if (
      !device ||
      !device.active ||
      device.revokedAt ||
      !device.driver ||
      !device.driver.active
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Credencial do dispositivo inválida."
      });
    }

    const sessionToken =
      crypto.randomBytes(32).toString("hex");

    const now = new Date();

    const expiresAt =
      new Date(
        now.getTime() +
        SESSION_DURATION_MS
      );

    const session =
      await prisma.driverTrackingSession.create({
        data: {
          deviceId: device.id,
          tokenHash:
            hashToken(sessionToken),
          expiresAt
        },
        select: {
          id: true,
          expiresAt: true
        }
      });

    res.cookie(
      DRIVER_SESSION_COOKIE,
      sessionToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/api/drivers",
        expires: session.expiresAt
      }
    );

    return res.status(200).json({
      success: true,
      driver: {
        id: device.driver.id,
        name: device.driver.name
      },
      device: {
        id: device.id,
        name: device.name
      },
      expiresAt:
        session.expiresAt
    });
  } catch (error) {
    console.error(
      "Erro ao ativar rastreamento:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao ativar rastreamento."
    });
  }
}

module.exports = {
  activate
};
