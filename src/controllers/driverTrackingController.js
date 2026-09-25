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

async function inspectActivationInvite(token) {
  const normalizedToken =
    String(token || "").trim();

  if (!normalizedToken) {
    return {
      success: false,
      status: 400,
      error:
        "Convite de ativação é obrigatório."
    };
  }

  const now =
    new Date();

  const invitation =
    await prisma.driverActivation.findFirst({
      where: {
        tokenHash:
          hashToken(normalizedToken),
        usedAt:
          null,
        revokedAt:
          null,
        expiresAt: {
          gt:
            now
        },
        driver: {
          active:
            true
        }
      },
      select: {
        expiresAt:
          true,
        driver: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

  if (
    !invitation ||
    !invitation.driver
  ) {
    return {
      success: false,
      status: 401,
      error:
        "Convite inválido, expirado ou já utilizado."
    };
  }

  return {
    success: true,
    status: 200,
    expiresAt:
      invitation.expiresAt,
    driver:
      invitation.driver
  };
}


async function consumeActivationInvite(token) {
  const normalizedToken =
    String(token || "").trim();

  if (!normalizedToken) {
    return {
      success: false,
      status: 400,
      error:
        "Convite de ativação é obrigatório."
    };
  }

  const invitationHash =
    hashToken(normalizedToken);

  const now =
    new Date();

  /*
   * O segredo permanente do dispositivo é criado somente
   * para satisfazer a identidade técnica do dispositivo.
   * O valor puro nunca é enviado ao navegador nem persistido.
   */
  const deviceSecret =
    crypto.randomBytes(32).toString("hex");

  const deviceTokenHash =
    hashToken(deviceSecret);

  const sessionToken =
    crypto.randomBytes(32).toString("hex");

  const sessionTokenHash =
    hashToken(sessionToken);

  const expiresAt =
    new Date(
      now.getTime() +
      SESSION_DURATION_MS
    );

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {

          /*
           * updateMany funciona aqui como consumo atômico:
           * somente um processo poderá transformar usedAt
           * de NULL para now para este convite ainda válido.
           */
          const consumed =
            await tx.driverActivation.updateMany({
              where: {
                tokenHash:
                  invitationHash,
                usedAt:
                  null,
                revokedAt:
                  null,
                expiresAt: {
                  gt:
                    now
                },
                driver: {
                  active:
                    true
                }
              },
              data: {
                usedAt:
                  now
              }
            });

          if (consumed.count !== 1) {
            const error =
              new Error(
                "INVALID_ACTIVATION_INVITE"
              );

            error.code =
              "INVALID_ACTIVATION_INVITE";

            throw error;
          }

          const invitation =
            await tx.driverActivation.findUnique({
              where: {
                tokenHash:
                  invitationHash
              },
              select: {
                driver: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            });

          if (
            !invitation ||
            !invitation.driver
          ) {
            const error =
              new Error(
                "INVALID_ACTIVATION_INVITE"
              );

            error.code =
              "INVALID_ACTIVATION_INVITE";

            throw error;
          }

          const device =
            await tx.driverTrackingDevice.create({
              data: {
                driverId:
                  invitation.driver.id,
                tokenHash:
                  deviceTokenHash,
                name:
                  "Celular ativado"
              },
              select: {
                id: true,
                name: true
              }
            });

          const session =
            await tx.driverTrackingSession.create({
              data: {
                deviceId:
                  device.id,
                tokenHash:
                  sessionTokenHash,
                expiresAt
              },
              select: {
                id: true,
                expiresAt: true
              }
            });

          return {
            driver:
              invitation.driver,
            device,
            session
          };

        }
      );

    return {
      success: true,
      status: 200,
      sessionToken,
      expiresAt:
        result.session.expiresAt,
      driver:
        result.driver,
      device:
        result.device
    };

  } catch (error) {

    if (
      error &&
      error.code ===
        "INVALID_ACTIVATION_INVITE"
    ) {
      return {
        success: false,
        status: 401,
        error:
          "Convite inválido, expirado ou já utilizado."
      };
    }

    throw error;
  }
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
  inspectActivationInvite,
  consumeActivationInvite,
  setSessionCookie
};
