const { routeAgent } = require("../orchestrator/agentRouter");
const { sendToAgent } = require("./openclawClient");

async function processMessage(session, message) {

  try {

    const agent = routeAgent(message);

    console.log("🤖 Agent selecionado:", agent);

    const response = await sendToAgent(
      agent,
      session,
      message
    );

    return response;

  } catch (error) {

    console.error("Erro IA:", error);

    return {
      text: "Desculpe, ocorreu um erro ao processar sua mensagem."
    };
  }
}

module.exports = {
  processMessage
};
