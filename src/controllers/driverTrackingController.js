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

function setSessionCookie(
  res,
  sessionToken,
  expiresAt
) {
  res.cookie(
    DRIVER_SESSION_COOKIE,
    sessionToken,
    {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/drivers",
      expires: expiresAt
    }
  );
}

async function createTrackingSession(token) {
  const normalizedToken =
    String(token || "").trim();

  if (!normalizedToken) {
    return {
      success: false,
      status: 400,
      error:
        "Credencial do dispositivo é obrigatória."
    };
  }

  const device =
    await prisma.driverTrackingDevice.findUnique({
      where: {
        tokenHash:
          hashToken(normalizedToken)
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
    return {
      success: false,
      status: 401,
      error:
        "Credencial do dispositivo inválida."
    };
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

  return {
    success: true,
    status: 200,
    sessionToken,
    expiresAt: session.expiresAt,
    driver: {
      id: device.driver.id,
      name: device.driver.name
    },
    device: {
      id: device.id,
      name: device.name
    }
  };
}

async function getSession(req, res) {
  try {
    const sessionToken =
      getCookie(
        req,
        DRIVER_SESSION_COOKIE
      );

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        authenticated: false
      });
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
      return res.status(401).json({
        success: false,
        authenticated: false
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      driver: {
        id: session.device.driver.id,
        name: session.device.driver.name
      },
      device: {
        id: session.device.id,
        name: session.device.name
      },
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt
    });
  } catch (error) {
    console.error(
      "Erro ao consultar sessão de rastreamento:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao consultar sessão de rastreamento."
    });
  }
}

async function activate(req, res) {
  try {
    const result =
      await createTrackingSession(
        req.body?.token
      );

    if (!result.success) {
      return res
        .status(result.status)
        .json({
          success: false,
          error: result.error
        });
    }

    setSessionCookie(
      res,
      result.sessionToken,
      result.expiresAt
    );

    return res.status(200).json({
      success: true,
      driver: result.driver,
      device: result.device,
      expiresAt: result.expiresAt
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
  activate,
  getSession,
  createTrackingSession,
  setSessionCookie
};
