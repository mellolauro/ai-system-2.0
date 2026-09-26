const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

const {
  getDriverGpsStatus
} = require("../utils/driverGps");

/**
 * GET /api/gps/map/:driverPhone
 * Renderiza o mapa web com Leaflet.js
 */
router.get("/map/:driverPhone", async (req, res) => {
  try {
    const { driverPhone } = req.params;

    const driver = await prisma.driver.findFirst({
      where: { phone: driverPhone },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicle: true,
        plate: true,
        latitude: true,
        longitude: true,
        lastLocationAt: true
      }
    });

    if (!driver) {
      return res.status(404).render("error", {
        layout: false,
        message: "Entregador não encontrado."
      });
    }

    res.render("gps-map", {
      layout: false, // Não utiliza o layout padrão para manter o mapa em tela cheia
      driver: {
        ...driver,
        gpsStatus:
          getDriverGpsStatus(driver)
      }
    });
  } catch (error) {
    console.error("Erro ao carregar mapa GPS:", error);
    res.status(500).send("Erro interno ao carregar o mapa.");
  }
});

/**
 * GET /api/gps/location/:driverPhone
 * API JSON para atualizar a posição no mapa via Polling / Fetch
 */
router.get("/location/:driverPhone", async (req, res) => {
  try {
    const { driverPhone } = req.params;

    const driver = await prisma.driver.findFirst({
      where: { phone: driverPhone },
      select: {
        latitude: true,
        longitude: true,
        lastLocationAt: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        gpsStatus: "UNAVAILABLE",
        message:
          "Entregador não encontrado."
      });
    }

    const gpsStatus =
      getDriverGpsStatus(driver);

    if (gpsStatus === "UNAVAILABLE") {
      return res.status(404).json({
        success: false,
        gpsStatus,
        message: "Sem sinal GPS."
      });
    }

    res.json({
      success: true,
      gpsStatus,
      latitude: driver.latitude,
      longitude: driver.longitude,
      lastLocationAt:
        driver.lastLocationAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
