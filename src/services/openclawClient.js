const WebSocket = require("ws");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = (process.env.OPENCLAW_URL || "ws://127.0.0.1:18789").replace(/\/$/, "");
const TOKEN = process.env.OPENCLAW_TOKEN;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "google/gemini-2.5-flash";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* =========================
   🔥 WS SINGLETON
========================= */

let ws = null;
let isConnected = false;
let isAuthenticated = false;
let isConnecting = false;

const pending = new Map();
const queue = [];

function connect() {
    if (isConnecting || isConnected) return;

    isConnecting = true;

    const url = `${BASE_URL}/v1?token=${TOKEN}`;

    console.log("[OpenClaw] 📡 Conectando...");

    ws = new WebSocket(url, {
        headers: {
            "x-openclaw-client": "ai-system-2.0"
        }
    });

    ws.on("open", () => {
        console.log("[OpenClaw] 🔌 Socket aberto");
    });

    ws.on("message", (data) => {
        try {
            const res = JSON.parse(data.toString());

            // 🔐 challenge
            if (res.type === "event" && res.event === "connect.challenge") {
                const nonce = res.payload.nonce;

                const signature = crypto
                    .createHmac("sha256", TOKEN)
                    .update(nonce)
                    .digest("hex");

                ws.send(JSON.stringify({
                    type: "connect.authenticate",
                    payload: { token: TOKEN, nonce, signature }
                }));

                return;
            }

            // ✅ autenticado
            if (res.type === "event" && res.event === "connect.authenticated") {
                console.log("[OpenClaw] ✅ Autenticado");

                isConnected = true;
                isAuthenticated = true;
                isConnecting = false;

                flushQueue();
                return;
            }

            if (!res.id) return;

            const req = pending.get(res.id);
            if (!req) return;

            if (res.type === "output") {
                const chunk = res.payload?.content || "";
                req.buffer += chunk;

                if (req.onToken) req.onToken(chunk);
            }

            if (res.type === "result") {
                pending.delete(res.id);
                req.resolve(req.buffer || res.payload?.content || "");
            }

            if (res.type === "error") {
                pending.delete(res.id);
                req.reject(new Error(res.payload?.message));
            }

        } catch (err) {
            console.error("[OpenClaw] parse error", err.message);
        }
    });

    ws.on("close", () => {
        console.warn("[OpenClaw] 🔌 Desconectado");

        isConnected = false;
        isAuthenticated = false;
        isConnecting = false;

        // rejeita pendentes
        pending.forEach((p) => p.reject(new Error("Conexão perdida")));
        pending.clear();

        setTimeout(connect, 2000);
    });

    ws.on("error", (err) => {
        console.error("[OpenClaw] 🔥 erro:", err.message);
    });
}

function send(payload) {
    if (!isAuthenticated) {
        queue.push(payload);
        connect();
        return;
    }

    ws.send(JSON.stringify(payload));
}

function flushQueue() {
    while (queue.length) {
        ws.send(JSON.stringify(queue.shift()));
    }
}

/* =========================
   🚀 ASK PRINCIPAL
========================= */

async function ask({
    text,
    session = "main",
    agent = "main",
    timeout = 60000,
    retries = 2,
    stream = false,
    onToken = null
}) {
    const traceId = uuidv4().slice(0, 8);

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`[OpenClaw][${traceId}] 🚀 Tentativa ${attempt + 1}`);

            const result = await askWS({
                text,
                session,
                agent,
                timeout,
                stream,
                onToken
            });

            return result;

        } catch (err) {
            console.warn(`[OpenClaw][${traceId}] ⚠️ ${err.message}`);

            if (attempt < retries) {
                await wait(1000 * (attempt + 1));
                continue;
            }

            console.warn(`[OpenClaw][${traceId}] 🔁 fallback`);
            return fallbackOpenRouter(text);
        }
    }
}

function askWS({ text, session, agent, timeout, stream, onToken }) {
    return new Promise((resolve, reject) => {
        const id = uuidv4();

        pending.set(id, {
            resolve,
            reject,
            buffer: "",
            onToken: stream ? onToken : null
        });

        send({
            id,
            type: "execute",
            payload: {
                agentId: agent,
                sessionId: session,
                content: text
            }
        });

        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                reject(new Error("Timeout OpenClaw"));
            }
        }, timeout);
    });
}

/* =========================
   🔁 FALLBACK
========================= */

async function fallbackOpenRouter(text) {
    const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: DEFAULT_MODEL,
            messages: [{ role: "user", content: text }]
        },
        {
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    return res.data.choices[0].message.content;
}

/* =========================
   📦 TELEGRAM SAFE
========================= */

function splitMessage(text, max = 4000) {
    const parts = [];
    for (let i = 0; i < text.length; i += max) {
        parts.push(text.slice(i, i + max));
    }
    return parts;
}

async function sendTelegramSafe(bot, chatId, text) {
    const parts = splitMessage(text);

    for (const part of parts) {
        await bot.sendMessage(chatId, part);
    }
}

/* ========================= */

connect();

module.exports = {
    ask,
    sendTelegramSafe
};
