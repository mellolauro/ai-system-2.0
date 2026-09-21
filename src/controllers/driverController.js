const crypto = require("crypto");

const {
  updateDriverLocation
} = require("../tools/deliveryTools");

function hashTrackingToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Controller para atualização autenticada da localização
 * do entregador em tempo real.
 */
async function updateLocation(req, res) {
  try {
    const authorization =
      req.get("Authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Credencial de rastreamento obrigatória."
      });
    }

    const token =
      authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Credencial de rastreamento inválida."
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
        error: "Os campos 'latitude' e 'longitude' são obrigatórios."
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
        error: "Coordenadas de latitude e longitude inválidas."
      });
    }

    const result =
      await updateDriverLocation({
        trackingTokenHash:
          hashTrackingToken(token),
        latitude: lat,
        longitude: lng
      });

    if (!result.success) {
      const status =
        result.code === "INVALID_TRACKING_TOKEN"
          ? 401
          : 400;

      return res.status(status).json({
        success: false,
        error:
          result.message ||
          "Não foi possível atualizar a localização."
      });
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
