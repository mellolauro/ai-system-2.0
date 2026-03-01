const WebSocket = require("ws");

function sendToAgent(agent, session, message) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://127.0.0.1:18789");

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "chat",
        agent,
        session,
        message
      }));
    });

    ws.on("message", (data) => {
      resolve(data.toString());
      ws.close();
    });

    ws.on("error", reject);
  });
}

module.exports = { sendToAgent };
