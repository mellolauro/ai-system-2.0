const { updateDriverLocation } = require("../tools/deliveryTools");

/**
 * Controller para atualização de localização do entregador em tempo real
 */
async function updateLocation(req, res) {
  try {
    const { driverPhone, latitude, longitude } = req.body;

    if (!driverPhone) {
      return res.status(400).json({
        success: false,
        error: "O campo 'driverPhone' é obrigatório."
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: "Os campos 'latitude' e 'longitude' são obrigatórios."
      });
    }

    // Obtém o tenantId a partir da sessão autenticada ou do header da requisição
    const tenantId = req.tenantId || req.user?.tenantId || req.headers["x-tenant-id"];

    const result = await updateDriverLocation({
      driverPhone,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      tenantId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro no driverController.updateLocation:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno ao atualizar a localização do entregador."
    });
  }
}

module.exports = {
  updateLocation
};
