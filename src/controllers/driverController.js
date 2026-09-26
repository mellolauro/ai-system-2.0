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
    driverId: session.device.driver.id,
    authType: "session"
  };
}

/**
 * Lista as entregas ativas atribuídas ao motorista autenticado.
 *
 * O driverId é obtido exclusivamente da sessão segura.
 * Nunca é aceito do navegador.
 */
async function listMyDeliveries(req, res) {
  try {
    const auth =
      await authenticateTracking(req);

    if (
      !auth ||
      auth.authType !== "session" ||
      !auth.driverId
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Sessão do entregador inválida."
      });
    }

    const deliveries =
      await prisma.delivery.findMany({
        where: {
          driverId: auth.driverId,
          status: {
            in: [
              "ASSIGNED",
              "PENDING",
              "SHIPPED",
              "OUT_FOR_DELIVERY"
            ]
          },
          order: {
            is: {
              status: "SHIPPED"
            }
          }
        },
        select: {
          id: true,
          orderId: true,
          orderNumber: true,
          status: true,
          recipientName: true,
          addressLine: true,
          city: true,
          state: true,
          zipCode: true,
          reference: true,
          estimatedDelivery: true,
          createdAt: true
        },
        orderBy: [
          {
            estimatedDelivery: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      });

    return res.status(200).json({
      success: true,
      deliveries
    });
  } catch (error) {
    console.error(
      "Erro ao listar entregas do motorista:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao consultar entregas."
    });
  }
}

/**
 * Inicia uma entrega atribuída ao motorista autenticado.
 *
 * O driverId vem exclusivamente da sessão segura.
 */
async function startDelivery(req, res) {
  try {
    const auth =
      await authenticateTracking(req);

    if (
      !auth ||
      auth.authType !== "session" ||
      !auth.driverId
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Sessão do entregador inválida."
      });
    }

    if (
      String(
        req.get("X-Driver-Tracking") || ""
      ) !== "1"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Requisição do entregador inválida."
      });
    }

    const deliveryId =
      String(req.params.id || "").trim();

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error:
          "Entrega inválida."
      });
    }

    const delivery =
      await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          driverId: auth.driverId
        },
        select: {
          id: true,
          status: true,
          orderId: true,
          order: {
            select: {
              status: true
            }
          }
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error:
          "Entrega não encontrada."
      });
    }

    if (delivery.status === "OUT_FOR_DELIVERY") {
      return res.status(200).json({
        success: true,
        delivery: {
          id: delivery.id,
          status: delivery.status
        }
      });
    }

    if (
      !delivery.orderId ||
      !delivery.order ||
      delivery.order.status !== "SHIPPED"
    ) {
      return res.status(409).json({
        success: false,
        error:
          "O pedido não está disponível para início da entrega."
      });
    }

    const eligibleStatuses = [
      "ASSIGNED",
      "PENDING",
      "SHIPPED"
    ];

    if (
      !eligibleStatuses.includes(
        delivery.status
      )
    ) {
      return res.status(409).json({
        success: false,
        error:
          "A entrega não está disponível para início."
      });
    }

    const updated =
      await prisma.delivery.updateMany({
        where: {
          id: delivery.id,
          driverId: auth.driverId,
          status: {
            in: eligibleStatuses
          },
          order: {
            is: {
              status: "SHIPPED"
            }
          }
        },
        data: {
          status: "OUT_FOR_DELIVERY"
        }
      });

    if (updated.count !== 1) {
      const current =
        await prisma.delivery.findFirst({
          where: {
            id: delivery.id,
            driverId: auth.driverId
          },
          select: {
            id: true,
            status: true
          }
        });

      if (
        current?.status ===
        "OUT_FOR_DELIVERY"
      ) {
        return res.status(200).json({
          success: true,
          delivery: current
        });
      }

      return res.status(409).json({
        success: false,
        error:
          "A entrega foi alterada e não pode mais ser iniciada."
      });
    }

    return res.status(200).json({
      success: true,
      delivery: {
        id: delivery.id,
        status: "OUT_FOR_DELIVERY"
      }
    });
  } catch (error) {
    console.error(
      "Erro ao iniciar entrega:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao iniciar a entrega."
    });
  }
}

/**
 * Conclui uma entrega do motorista autenticado.
 *
 * Delivery e Order são atualizados atomicamente.
 */
async function completeDelivery(req, res) {
  try {
    const auth =
      await authenticateTracking(req);

    if (
      !auth ||
      auth.authType !== "session" ||
      !auth.driverId
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Sessão do entregador inválida."
      });
    }

    if (
      String(
        req.get("X-Driver-Tracking") || ""
      ) !== "1"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Requisição do entregador inválida."
      });
    }

    const deliveryId =
      String(req.params.id || "").trim();

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error:
          "Entrega inválida."
      });
    }

    const delivery =
      await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          driverId: auth.driverId
        },
        select: {
          id: true,
          status: true,
          deliveredAt: true,
          orderId: true,
          order: {
            select: {
              status: true,
              deliveredAt: true
            }
          }
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error:
          "Entrega não encontrada."
      });
    }

    if (
      delivery.status === "DELIVERED" &&
      delivery.order?.status === "DELIVERED"
    ) {
      return res.status(200).json({
        success: true,
        delivery: {
          id: delivery.id,
          status: "DELIVERED",
          deliveredAt:
            delivery.deliveredAt ||
            delivery.order.deliveredAt
        }
      });
    }

    if (
      delivery.status !==
      "OUT_FOR_DELIVERY"
    ) {
      return res.status(409).json({
        success: false,
        error:
          "A entrega não está em andamento."
      });
    }

    if (
      !delivery.orderId ||
      !delivery.order ||
      delivery.order.status !== "SHIPPED"
    ) {
      return res.status(409).json({
        success: false,
        error:
          "O pedido não está disponível para conclusão."
      });
    }

    const deliveredAt = new Date();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const deliveryUpdate =
            await tx.delivery.updateMany({
              where: {
                id: delivery.id,
                driverId: auth.driverId,
                status:
                  "OUT_FOR_DELIVERY",
                order: {
                  is: {
                    status: "SHIPPED"
                  }
                }
              },
              data: {
                status: "DELIVERED",
                deliveredAt
              }
            });

          if (deliveryUpdate.count !== 1) {
            throw new Error(
              "DELIVERY_STATE_CHANGED"
            );
          }

          const orderUpdate =
            await tx.order.updateMany({
              where: {
                id: delivery.orderId,
                status: "SHIPPED"
              },
              data: {
                status: "DELIVERED",
                deliveredAt
              }
            });

          if (orderUpdate.count !== 1) {
            throw new Error(
              "ORDER_STATE_CHANGED"
            );
          }

          return {
            id: delivery.id,
            status: "DELIVERED",
            deliveredAt
          };
        }
      );

    return res.status(200).json({
      success: true,
      delivery: result
    });
  } catch (error) {
    if (
      error?.message ===
        "DELIVERY_STATE_CHANGED" ||
      error?.message ===
        "ORDER_STATE_CHANGED"
    ) {
      return res.status(409).json({
        success: false,
        error:
          "A entrega foi alterada e não pode mais ser concluída."
      });
    }

    console.error(
      "Erro ao concluir entrega:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao concluir a entrega."
    });
  }
}

/**
 * Registra atividade do dispositivo de rastreamento
 * sem criar ou alterar uma posição GPS.
 */
async function heartbeat(req, res) {
  try {
    const auth =
      await authenticateTracking(req);

    if (
      !auth ||
      auth.authType !== "session" ||
      !auth.sessionId ||
      !auth.driverId
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Sessão do entregador inválida."
      });
    }

    if (
      String(
        req.get("X-Driver-Tracking") || ""
      ) !== "1"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Requisição de rastreamento inválida."
      });
    }

    const now = new Date();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const session =
            await tx.driverTrackingSession.updateMany({
              where: {
                id: auth.sessionId,
                revokedAt: null,
                expiresAt: {
                  gt: now
                },
                device: {
                  is: {
                    active: true,
                    revokedAt: null,
                    driverId:
                      auth.driverId,
                    driver: {
                      is: {
                        active: true
                      }
                    }
                  }
                }
              },
              data: {
                lastSeenAt: now
              }
            });

          if (session.count !== 1) {
            throw new Error(
              "TRACKING_SESSION_CHANGED"
            );
          }

          const device =
            await tx.driverTrackingDevice.updateMany({
              where: {
                driverId:
                  auth.driverId,
                active: true,
                revokedAt: null,
                sessions: {
                  some: {
                    id: auth.sessionId,
                    revokedAt: null,
                    expiresAt: {
                      gt: now
                    }
                  }
                }
              },
              data: {
                lastSeenAt: now
              }
            });

          if (device.count !== 1) {
            throw new Error(
              "TRACKING_DEVICE_CHANGED"
            );
          }

          return now;
        }
      );

    return res.status(200).json({
      success: true,
      timestamp: result
    });
  } catch (error) {
    if (
      error?.message ===
        "TRACKING_SESSION_CHANGED" ||
      error?.message ===
        "TRACKING_DEVICE_CHANGED"
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Sessão do entregador inválida."
      });
    }

    console.error(
      "Erro no heartbeat do rastreamento:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno no heartbeat do rastreamento."
    });
  }
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
  authenticateTracking,
  listMyDeliveries,
  startDelivery,
  completeDelivery,
  heartbeat,
  updateLocation
};
