const { processMessage } = require("../services/aiService");

async function handleChat(req, res) {

  try {

    const { session, message } = req.body;

    if (!session || !message) {
      return res.status(400).json({
        error: "session e message são obrigatórios"
      });
    }

    const response = await processMessage(
      session,
      message
    );

    res.json({
      success: true,
      response
    });

  } catch (error) {

    console.error("Erro chat:", error);

    res.status(500).json({
      error: "Erro interno"
    });
  }
}

module.exports = {
  handleChat
};
