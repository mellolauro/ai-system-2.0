const WebSocket = require("ws");

const RAW_URL = process.env.OPENCLAW_URL || "ws://192.168.1.5:18789";
const TOKEN = process.env.OPENCLAW_TOKEN;

const BASE_URL = RAW_URL.replace("/v1", "");

let ws = null;
let isConnected = false;
let isConnecting = false;

let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 30000;

let pending = new Map();
let queue = [];

let heartbeatInterval = null;

console.log("🚀 [OpenClaw] Client inicializando (v2026 enterprise)...");

/**
 * UUID simples
 */
function uuid() {
    return Math.random().toString(36).substring(2, 11);
}

/**
 * Conectar (singleton)
 */
function connect() {
    if (isConnected || isConnecting) return;

    isConnecting = true;

    console.log(`[OpenClaw] 📡 Conectando em: ${BASE_URL}`);

    ws = new WebSocket(BASE_URL, {
        headers: {
            "Authorization": `Bearer ${TOKEN}`,
            "x-openclaw-client": "ai-system-2.0",
            "User-Agent": "OpenClaw-AI-System/2.0"
        },
        handshakeTimeout: 10000
    });

    ws.on("open", () => {
        console.log("[OpenClaw] ✅ Conectado");

        isConnected = true;
        isConnecting = false;

        reconnectDelay = 3000;

        startHeartbeat();
        flushQueue();
    });

    ws.on("message", (data) => {
        try {
            const res = JSON.parse(data.toString());

            if (!res.id) return;

            const req = pending.get(res.id);
            if (!req) return;

            if (res.type === "output") {
                req.stream += res.payload?.content || "";
                return;
            }

            if (res.type === "result") {
                pending.delete(res.id);

                const final =
                    req.stream ||
                    res.payload?.content ||
                    res.payload?.output ||
                    "";

                req.resolve(final);
            }

            if (res.type === "error") {
                pending.delete(res.id);
                req.reject(
                    new Error(res.payload?.message || "Erro no gateway")
                );
            }
        } catch (err) {
            console.error("[OpenClaw] parse error:", err.message);
        }
    });

    ws.on("close", (code) => {
        console.warn(`[OpenClaw] 🔌 Desconectado (${code})`);

        cleanup();

        // rejeita requisições pendentes
        pending.forEach((req) =>
            req.reject(new Error("Conexão perdida"))
        );
        pending.clear();

        scheduleReconnect();
    });

    ws.on("error", (err) => {
        console.error("[OpenClaw] 🔥 erro:", err.message);
    });

    ws.on("unexpected-response", (req, res) => {
        console.error(
            `[OpenClaw] ❌ Handshake rejeitado: ${res.statusCode}`
        );
    });
}

/**
 * Heartbeat (mantém conexão viva)
 */
function startHeartbeat() {
    stopHeartbeat();

    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 15000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/**
 * Reconnect inteligente
 */
function scheduleReconnect() {
    isConnected = false;
    isConnecting = false;

    console.log(
        `[OpenClaw] 🔄 Reconectando em ${reconnectDelay / 1000}s...`
    );

    setTimeout(connect, reconnectDelay);

    reconnectDelay = Math.min(
        reconnectDelay * 1.5,
        MAX_RECONNECT_DELAY
    );
}

/**
 * Cleanup conexão
 */
function cleanup() {
    stopHeartbeat();

    if (ws) {
        try {
            ws.terminate();
        } catch {}
        ws = null;
    }
}

/**
 * Envio seguro
 */
function send(payload) {
    if (!isConnected) {
        queue.push(payload);
        connect();
        return;
    }

    try {
        ws.send(JSON.stringify(payload));
    } catch (err) {
        console.error("[OpenClaw] erro ao enviar:", err.message);
        queue.push(payload);
    }
}

/**
 * Flush fila
 */
function flushQueue() {
    while (queue.length > 0 && isConnected) {
        const payload = queue.shift();
        ws.send(JSON.stringify(payload));
    }
}

/**
 * API principal
 */
function ask({
    text,
    session = "main",
    agent = "main",
    timeout = 60000
}) {
    return new Promise((resolve, reject) => {
        const id = uuid();

        const payload = {
            id,
            type: "execute",
            payload: {
                agentId: agent,
                sessionId: session,
                content: text
            }
        };

        pending.set(id, {
            resolve,
            reject,
            stream: ""
        });

        send(payload);

        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                reject(new Error("Timeout da IA"));
            }
        }, timeout);
    });
}

// inicia automático
connect();

module.exports = { ask };
