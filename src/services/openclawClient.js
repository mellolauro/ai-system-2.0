const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const OPENCLAW_URL = "ws://127.0.0.1:18789";

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendToAgent(agent, session, message, retries = 5) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {

      return await new Promise((resolve, reject) => {

        const ws = new WebSocket(OPENCLAW_URL);

        const correlationId = uuidv4();

        let output = "";
        let connected = false;

        console.log(`[OpenClaw] connecting attempt ${attempt}`);

        const timeout = setTimeout(() => {

          console.log("[OpenClaw] timeout");

          ws.close();

          reject(new Error("OpenClaw timeout"));

        }, 60000);

        ws.on("open", () => {

          console.log("[OpenClaw] socket open");

        });

        ws.on("message", (data) => {

          let msg;

          try {

            msg = JSON.parse(data.toString());

          } catch {

            console.log("[OpenClaw] invalid JSON");

            return;
          }

          // challenge
          if (msg.event === "connect.challenge") {

            console.log("[OpenClaw] challenge received");

            ws.send(JSON.stringify({
              type: "connect.challenge",
              payload: {
              nonce: msg.payload.nonce,
              ts: msg.payload.ts
            }
          }));

            return;
          }

          // accepted
          if (msg.event === "connect.accepted") {

            console.log("[OpenClaw] connection accepted");

            connected = true;

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

          // streaming
          if (msg.event === "agent.delta") {

            const chunk = msg.data?.delta || "";

            output += chunk;

            return;

          }

          // final output
          if (msg.event === "agent.output") {

            clearTimeout(timeout);

            const result = msg.data?.output || output;

            console.log("[OpenClaw] response received");

            ws.close();

            resolve(result);

          }

        });

        ws.on("error", (err) => {

          clearTimeout(timeout);

          console.log("[OpenClaw] error", err.message);

          reject(err);

        });

        ws.on("close", () => {

          console.log("[OpenClaw] socket closed");

          if (!connected) {

            reject(new Error("connection closed before handshake"));

          }

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
