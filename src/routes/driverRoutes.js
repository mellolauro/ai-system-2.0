const express = require("express");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const driverController =
  require("../controllers/driverController");

const driverTrackingController =
  require("../controllers/driverTrackingController");

const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Muitas tentativas de ativação. Aguarde antes de tentar novamente."
  }
});

const locationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "Muitas atualizações de localização. Aguarde antes de tentar novamente."
  }
});

// GET /api/drivers/tracking/session
router.get(
  "/tracking/session",
  driverTrackingController.getSession
);

// POST /api/drivers/tracking/activate
router.post(
  "/tracking/activate",
  activationLimiter,
  driverTrackingController.activate
);

// GET /api/drivers/deliveries
router.get(
  "/deliveries",
  driverController.listMyDeliveries
);

// POST /api/drivers/location
router.post(
  "/location",
  locationLimiter,
  driverController.updateLocation
);

module.exports = router;
