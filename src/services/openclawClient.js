const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const OPENCLAW_URL =
  process.env.OPENCLAW_URL ||
  "ws://127.0.0.1:18789/__openclaw__/ws";

let ws = null;
let connected = false;

const pending = new Map();
const queue = [];

function connect() {

  if (ws) return;

  console.log("[OpenClaw] connecting...");

  ws = new WebSocket(OPENCLAW_URL);

  ws.on("open", () => {
    console.log("[OpenClaw] socket open");
  });

  ws.on("message", (raw) => {

    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    /**
     * 🔐 handshake
     */
    if (msg.type === "event" && msg.event === "connect.challenge") {

      console.log("[OpenClaw] challenge received");

      ws.send(
        JSON.stringify({
          type: "connect.accept",
          payload: {
            nonce: msg.payload.nonce
          }
        })
      );

      console.log("[OpenClaw] challenge accepted");

      connected = true;

      flushQueue();

      return;
    }

    /**
     * 📩 resposta do agente
     */
    if (msg.type === "result") {

      const resolver = pending.get(msg.id);

      if (resolver) {
        resolver(msg.payload?.text || "");
        pending.delete(msg.id);
      }

      return;
    }

  });

  ws.on("close", () => {

    console.log("[OpenClaw] socket closed");

    connected = false;
    ws = null;

    setTimeout(connect, 2000);

  });

  ws.on("error", (err) => {

    console.log("[OpenClaw] socket error:", err.message);

  });

}

function flushQueue() {

  while (queue.length && connected) {

    const item = queue.shift();

    ws.send(JSON.stringify(item));

  }

}

/**
 * Envia comando para o agente
 */
function sendCommand(command) {

  if (!connected) {

    console.log("[OpenClaw] queue message (not connected)");

    queue.push(command);
    return;

  }

  ws.send(JSON.stringify(command));

}

/**
 * Função principal usada pelo orchestrator
 */
function ask(text, sessionId = "default") {

  return new Promise((resolve) => {

    const id = uuidv4();

    pending.set(id, resolve);

    const command = {
      id,
      type: "command",
      command: "run",
      payload: {
        text,
        session: sessionId
      }
    };

    sendCommand(command);

  });

}

connect();

module.exports = {
  ask
};
