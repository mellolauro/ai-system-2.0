const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const OPENCLAW_URL = "ws://127.0.0.1:18789";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendToAgent(agent, session, message, retries = 5) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {

      return await new Promise((resolve, reject) => {

        const ws = new WebSocket(OPENCLAW_URL);
        const correlationId = uuidv4();

        ws.on("open", () => {
          console.log("[OpenClaw] socket open");
        });

        ws.on("message", (data) => {

          const msg = JSON.parse(data.toString());

          if (msg.event === "connect.challenge") {

            ws.send(JSON.stringify({
              type: "connect.challenge",
              payload: msg.payload
            }));

            return;
          }

          if (msg.event === "connect.accepted") {

            ws.send(JSON.stringify({
              type: "chat",
              agent,
              session,
              message,
              correlationId
            }));

            return;
          }

          if (msg.correlationId === correlationId) {

            resolve(msg.response || msg);
            ws.close();

          }

        });

        ws.on("error", reject);

      });

    } catch (err) {

      console.log(`[OpenClaw] tentativa ${attempt} falhou`);

      if (attempt === retries) {
        throw err;
      }

      await sleep(2000);

    }

  }

}

module.exports = { sendToAgent };
