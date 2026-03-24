const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const URL = process.env.OPENCLAW_URL || "ws://127.0.0.1:18789";
const TOKEN = (process.env.OPENCLAW_TOKEN || "").trim();

let ws = null;
let isReady = false;
let isConnecting = false;

const queue = [];
const pending = new Map();

function connect() {
  if (ws || isConnecting) return;
  isConnecting = true;
  
  console.log("[OpenClaw] 🔍 Conectando ao Gateway Local:", URL);

  ws = new WebSocket(URL, {
    headers: {
      // 🛡️ CRÍTICO: Em modo loopback, o Gateway exige estes 3 headers exatos
      "Origin": "http://127.0.0.1:18789",
      "Host": "127.0.0.1:18789",
      "Authorization": `Bearer ${TOKEN}`
    }
  });

  ws.on("open", () => {
    console.log("[OpenClaw] Socket Aberto ✅");
    isConnecting = false;
    
    // ⚡ O binário exige um handshake de protocolo assim que abre
    ws.send(JSON.stringify({
      type: "command",
      command: "protocol.handshake",
      payload: { version: "2026.3", client: "ai-system-2.0" }
    }));
  });

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());

    // 🛡️ Se ele pedir o challenge mesmo com o header (algumas versões fazem isso)
    if (msg.event === "connect.challenge") {
      ws.send(JSON.stringify({
        command: "connect.answer",
        nonce: msg.payload.nonce,
        token: TOKEN
      }));
      return;
    }

    // ✅ SUCESSO
    if (msg.event === "connect.success" || msg.event === "session.ready") {
      console.log("[OpenClaw] Autenticado com sucesso! 🚀");
      isReady = true;
      flushQueue();
      return;
    }

    // 📩 RESULTADOS
    if (msg.type === "result") {
      const handler = pending.get(msg.id);
      if (handler) {
        handler.resolve(msg.payload?.output || msg.payload?.text || "");
        pending.delete(msg.id);
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[OpenClaw] ❌ Conexão encerrada (${code}): ${reason}`);
    isReady = false;
    isConnecting = false;
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("[OpenClaw] 💥 Erro:", err.message);
  });
}

function flushQueue() {
  while (queue.length && isReady) {
    const cmd = queue.shift();
    ws.send(JSON.stringify(cmd));
  }
}

function ask({ text, session = "default", agent = "main" }) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Timeout OpenClaw"));
    }, 60000);

    pending.set(id, {
      resolve: (data) => { clearTimeout(timer); resolve(data); },
      reject: (err) => { clearTimeout(timer); reject(err); }
    });

    const command = {
      id,
      type: "command",
      command: "agent.run",
      payload: { session_id: session, agent, messages: [{ role: "user", content: text }] }
    };

    if (!isReady) queue.push(command);
    else ws.send(JSON.stringify(command));
  });
}

connect();
module.exports = { ask };
