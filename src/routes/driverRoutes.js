const express = require("express");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const driverController =
  require("../controllers/driverController");

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

// POST /api/drivers/location
router.post(
  "/location",
  locationLimiter,
  driverController.updateLocation
);

module.exports = router;
