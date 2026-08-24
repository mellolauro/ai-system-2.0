const express = require("express");

const router = express.Router();

const MessageController = require("../controllers/MessageController");

/**
 * Endpoint principal de processamento de mensagens.
 *
 * Fluxo:
 *
 * HTTP
 *  ↓
 * MessageController
 *  ↓
 * Orchestrator
 *  ↓
 * ChatPipeline
 */
router.post("/", (req, res) => {

    return MessageController.http(req, res);

});

module.exports = router;
