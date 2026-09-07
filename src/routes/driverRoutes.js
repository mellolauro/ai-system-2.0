const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");

// Mapeia POST /api/drivers/location
router.post("/location", driverController.updateLocation);

module.exports = router;
