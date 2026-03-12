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

        const ws = new WebSocket(OPENCLAW_URL, {
          protocol: "openclaw"
        });
        const correlationId = uuidv4();

        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("OpenClaw timeout"));
        }, 60000);

        ws.on("open", () => {

           console.log("[OpenClaw] socket open");

          ws.send(JSON.stringify({
            type: "connect",
            client: "ai-system",
            version: "1.0"
  }));

});

        ws.on("message", (data) => {

          const msg = JSON.parse(data.toString());

          // handshake challenge
          if (msg.event === "connect.challenge") {

            ws.send(JSON.stringify({
            type: "connect.challenge",
            nonce: msg.payload.nonce,
            ts: msg.payload.ts
          }));

}

          // gateway accepted
          if (msg.event === "connect.accepted") {

            ws.send(JSON.stringify({

              type: "run",

              agent,

              userId: session,
              sessionId: session,

              input: message,

              correlationId

            }));

            return;
          }

          // resposta do agente
          if (msg.event === "agent.output") {

            clearTimeout(timeout);

            resolve(msg.data?.output || msg);

            ws.close();

          }

        });

        ws.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        ws.on("close", () => {
          console.log("[OpenClaw] socket closed");
        });

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
