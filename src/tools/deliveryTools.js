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
async function updateDriverLocation({ driverPhone, latitude, longitude, tenantId }) {
  try {
    const driver = await prisma.driver.findFirst({
      where: {
        phone: driverPhone,
        ...(tenantId ? { tenantId } : {})
      }
    });

    if (!driver) {
      return {
        success: false,
        message: "Entregador não encontrado com o número informado."
      };
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        message: "Coordenadas de latitude e longitude inválidas."
      };
    }

    // Atualiza a posição atual no entregador
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        latitude: lat,
        longitude: lng,
        lastLocationAt: new Date()
      }
    });

    // Registra no histórico de posições do entregador
    await prisma.driverLocation.create({
      data: {
        driverId: driver.id,
        latitude: lat,
        longitude: lng
      }
    });

    return {
      success: true,
      message: "Localização atualizada com sucesso.",
      driverId: updatedDriver.id,
      timestamp: updatedDriver.lastLocationAt
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao atualizar localização: ${error.message}`
    };
  }
}

/**
 * Definições das tools no padrão Function Calling exigido pelo ToolManager / LLM
 */
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
  },
  {
    name: "updateDriverLocation",
    description:
      "Atualiza a posição GPS (latitude/longitude) do entregador e insere o ponto no histórico de rastreamento.",
    parameters: {
      type: "object",
      properties: {
        driverPhone: {
          type: "string",
          description: "Número de celular/WhatsApp cadastrado do entregador."
        },
        latitude: {
          type: "number",
          description: "Latitude geográfica atual."
        },
        longitude: {
          type: "number",
          description: "Longitude geográfica atual."
        }
      },
      required: ["driverPhone", "latitude", "longitude"],
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

    case "updateDriverLocation":
      return await updateDriverLocation(enrichedArgs);

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
