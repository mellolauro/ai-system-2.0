const express = require("express");
const router = express.Router();

const { handleChat } = require("../controllers/chatController");

/**
 * Endpoint principal de chat IA
 */
router.post("/", handleChat);

module.exports = router;
