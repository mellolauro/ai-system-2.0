const express = require("express");
const router = express.Router();

const upload = require("../config/upload");
const controller = require("../controllers/productController");

router.get("/", controller.list);

router.post("/create", upload.single("image"), controller.create);

module.exports = router;
