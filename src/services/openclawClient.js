const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// URL base sem caminhos adicionais, conforme testado com sucesso
const URL = process.env.OPENCLAW_URL || "ws://127.0.0.1:18789";

let ws = null;
let isReady = false;
let isConnecting = false;
let reconnectAttempts = 0;

const queue = [];
const pending = new Map();

/**
 * 🔌 CONECTAR
 */
function connect() {
  if (ws || isConnecting) return;

  isConnecting = true;
  console.log("[OpenClaw] Tentando conectar em:", URL);

  ws = new WebSocket(URL, {
    handshakeTimeout: 5000,
    headers: {
      "Origin": "http://127.0.0.1:18789",
      // User-Agent padrão de navegador para evitar bloqueios de segurança
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) ai-system/2.0"
    }
  });

  ws.on("open", () => {
    console.log("[OpenClaw] Socket aberto com sucesso ✅ Aguardando desafio...");
    isConnecting = false;
    // Não enviamos nada aqui. Esperamos o servidor mandar o 'connect.challenge'
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    // 🛡️ 1. RESPONDER AO DESAFIO (CHALLENGE)
    if (msg.type === "event" && msg.event === "connect.challenge") {
      console.log("[OpenClaw] 🛡️ Desafio recebido. Autenticando com Token...");
      
      ws.send(JSON.stringify({
        type: "command",
        command: "connect.answer",
        payload: {
          nonce: msg.payload.nonce,
          token: process.env.OPENCLAW_TOKEN || ""
        }
      }));
      return;
    }

    // ✅ 2. SUCESSO NA AUTENTICAÇÃO / INICIAR SESSÃO
    if (msg.type === "event" && (msg.event === "connect.success" || msg.event === "session.ready")) {
      console.log("[OpenClaw] Autenticado com sucesso! 🚀");
      
      // Se a sessão ainda não estiver pronta, enviamos o start agora que estamos logados
      if (!isReady) {
        ws.send(JSON.stringify({
          type: "command",
          command: "session.start",
          payload: { client: "ai-system", version: "2.0" }
        }));
        
        isReady = true;
        reconnectAttempts = 0;
        flushQueue();
      }
      return;
    }

    // 📩 3. RESULTADO FINAL DO AGENTE
    if (msg.type === "result") {
      const handler = pending.get(msg.id);
      if (handler) {
        handler.resolve(msg.payload?.output || msg.payload?.text || "");
        pending.delete(msg.id);
      }
      return;
    }

    // ❌ 4. TRATAMENTO DE ERROS
    if (msg.type === "error") {
      const handler = pending.get(msg.id);
      if (handler) {
        console.error("[OpenClaw] Erro retornado:", msg.payload);
        handler.reject(msg.payload || "Erro interno do OpenClaw");
        pending.delete(msg.id);
      }
    }
  });

  ws.on("close", () => {
    console.log("[OpenClaw] Conexão fechada. Tentando reconectar...");
    cleanup();
    reconnect();
  });

  ws.on("error", (err) => {
    console.error("[OpenClaw] Erro no Socket:", err.message);
  });
}

function cleanup() {
  isReady = false;
  isConnecting = false;
  if (ws) {
    try { ws.terminate(); } catch (e) {}
  }
  ws = null;
}

function reconnect() {
  reconnectAttempts++;
  const delay = Math.min(1000 * reconnectAttempts, 10000);
  setTimeout(connect, delay);
}

function flushQueue() {
  while (queue.length && isReady && ws?.readyState === WebSocket.OPEN) {
    const cmd = queue.shift();
    ws.send(JSON.stringify(cmd));
  }
}

function send(command) {
  if (!isReady || ws?.readyState !== WebSocket.OPEN) {
    console.log("[OpenClaw] Aguardando autenticação. Comando enfileirado.");
    queue.push(command);
    return;
  }
  ws.send(JSON.stringify(command));
}

function ask({ 
  text, 
  session = "default", 
  agent = "main", 
  systemPrompt = null, 
  timeout = 60000 
}) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("OpenClaw timeout após 60s"));
    }, timeout);

    pending.set(id, {
      resolve: (data) => {
        clearTimeout(timer);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      }
    });

    const command = {
      id,
      type: "command",
      command: "agent.run",
      payload: {
        session_id: session,
        agent,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: text }
        ]
      }
    };

    send(command);
  });
}

connect();

module.exports = { ask };
