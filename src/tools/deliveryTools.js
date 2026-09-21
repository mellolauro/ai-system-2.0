const prisma = require("../prisma");

/**
 * Consulta o status completo da entrega e a localização do entregador
 */
async function trackDelivery({ orderId, deliveryId, orderNumber, tenantId }) {
  try {
    const whereConditions = [];

    if (deliveryId) whereConditions.push({ id: deliveryId });
    if (orderId) whereConditions.push({ orderId: orderId });
    if (orderNumber) whereConditions.push({ orderNumber: orderNumber });

    if (whereConditions.length === 0) {
      return {
        success: false,
        message: "Informe ao menos orderId, deliveryId ou orderNumber para consulta."
      };
    }

    // Filtra aplicando o tenantId para garantir o isolamento multi-tenant
    const delivery = await prisma.delivery.findFirst({
      where: {
        OR: whereConditions,
        ...(tenantId ? { tenantId } : {})
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicle: true,
            vehicleInfo: true,
            plate: true,
            latitude: true,
            longitude: true,
            lastLocationAt: true
          }
        }
      }
    });

    if (!delivery) {
      return {
        success: false,
        message: "Entrega não encontrada para os dados fornecidos."
      };
    }

    const isMoving = delivery.status === "OUT_FOR_DELIVERY" && delivery.driver?.latitude;

    return {
      success: true,
      deliveryId: delivery.id,
      orderId: delivery.orderId || delivery.orderNumber,
      status: delivery.status,
      recipient: {
        name: delivery.recipientName,
        phone: delivery.recipientPhone || delivery.customerPhone,
        address: delivery.addressLine
      },
      driver: delivery.driver
        ? {
            name: delivery.driver.name,
            phone: delivery.driver.phone,
            vehicle: delivery.driver.vehicleInfo || delivery.driver.vehicle,
            plate: delivery.driver.plate,
            location: isMoving
              ? {
                  latitude: delivery.driver.latitude,
                  longitude: delivery.driver.longitude,
                  updatedAt: delivery.driver.lastLocationAt
                }
              : null
          }
        : null,
      estimatedDelivery: delivery.estimatedDelivery
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao rastrear entrega: ${error.message}`
    };
  }
}

/**
 * Registra/Atualiza a localização GPS do entregador
 */
async function updateDriverLocation({
  trackingTokenHash,
  latitude,
  longitude
}) {
  try {
    if (!trackingTokenHash) {
      return {
        success: false,
        code: "INVALID_TRACKING_TOKEN",
        message: "Credencial de rastreamento inválida."
      };
    }

    const device =
      await prisma.driverTrackingDevice.findUnique({
        where: {
          tokenHash: trackingTokenHash
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
        code: "INVALID_TRACKING_TOKEN",
        message: "Credencial de rastreamento inválida."
      };
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
      return {
        success: false,
        message: "Coordenadas de latitude e longitude inválidas."
      };
    }

    const now = new Date();

    const updatedDriver =
      await prisma.$transaction(async (tx) => {
        const updated =
          await tx.driver.update({
            where: {
              id: device.driver.id
            },
            data: {
              latitude: lat,
              longitude: lng,
              lastLocationAt: now
            }
          });

        await tx.driverLocation.create({
          data: {
            driverId: device.driver.id,
            latitude: lat,
            longitude: lng,
            timestamp: now
          }
        });

        await tx.driverTrackingDevice.update({
          where: {
            id: device.id
          },
          data: {
            lastSeenAt: now
          }
        });

        return updated;
      });

    return {
      success: true,
      message: "Localização atualizada com sucesso.",
      driverId: updatedDriver.id,
      deviceId: device.id,
      timestamp: updatedDriver.lastLocationAt
    };
  } catch (error) {
    console.error(
      "Erro em updateDriverLocation:",
      error
    );

    return {
      success: false,
      message: "Erro interno ao atualizar localização."
    };
  }
}

const deliveryToolsDefinitions = [
  {
    name: "trackDelivery",
    description:
      "Consulta o status de entrega e a localização em tempo real do entregador associado ao pedido.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "ID único do pedido no banco de dados."
        },
        deliveryId: {
          type: "string",
          description: "ID único do registro de entrega."
        },
        orderNumber: {
          type: "string",
          description: "Código ou número legível do pedido."
        }
      },
      additionalProperties: false
    }
  }
];

/**
 * Dispatcher chamado pelo ToolManager para executar a Tool apropriada
 */
async function handleDeliveryTool({ name, args, context }) {
  const enrichedArgs = {
    ...args,
    tenantId: context?.tenantId || args?.tenantId
  };

  switch (name) {
    case "trackDelivery":
      return await trackDelivery(enrichedArgs);

    default:
      return {
        success: false,
        error: `Tool de entrega não mapeada: ${name}`
      };
  }
}

module.exports = {
  trackDelivery,
  updateDriverLocation,
  deliveryToolsDefinitions,
  handleDeliveryTool
};
