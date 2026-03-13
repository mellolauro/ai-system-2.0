const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const OPENCLAW_URL = "ws://127.0.0.1:18789/__openclaw__/ws";

let ws = null;
let connected = false;
let connecting = false;

const pending = new Map();
const queue = [];

const REQUEST_TIMEOUT = 60000;
const RECONNECT_DELAY = 2000;

function log(...args) {
  console.log("[OpenClaw]", ...args);
}

/* ---------------- CONNECTION ---------------- */

function connect() {

  if (connected || connecting) return;

  connecting = true;

  log("connecting...");

  ws = new WebSocket(OPENCLAW_URL);

  ws.on("open", () => {

    log("socket open");

    ws.send(JSON.stringify({
      type: "connect",
      client: "ai-system",
      version: "1.0"
    }));

  });

  ws.on("message", handleMessage);

  ws.on("close", () => {

    log("socket closed");

    connected = false;
    connecting = false;

    setTimeout(connect, RECONNECT_DELAY);

  });

  ws.on("error", (err) => {

    log("socket error:", err.message);

  });

}

/* ---------------- MESSAGE HANDLER ---------------- */

function handleMessage(data) {

  let msg;

  try {
    msg = JSON.parse(data.toString());
  } catch {
    return;
  }

  /* handshake challenge */

  if (msg.event === "connect.challenge") {

    ws.send(JSON.stringify({
      type: "connect.challenge",
      nonce: msg.payload.nonce,
      ts: msg.payload.ts
    }));

    return;
  }

  /* handshake accepted */

  if (msg.event === "connect.accepted") {

    connected = true;
    connecting = false;

    log("connected");

    flushQueue();

    return;

  }

  /* streaming token */

  if (msg.event === "agent.token") {

    const correlationId = msg.data?.correlationId;

    if (!pending.has(correlationId)) return;

    const req = pending.get(correlationId);

    if (req.onToken) {
      req.onToken(msg.data.token);
    }

    return;

  }

  /* final output */

  if (msg.event === "agent.output") {

    const correlationId = msg.data?.correlationId;

    if (!pending.has(correlationId)) return;

    const req = pending.get(correlationId);

    req.resolve(msg.data.output);

    pending.delete(correlationId);

    return;

  }

}

/* ---------------- QUEUE ---------------- */

function flushQueue() {

  while (queue.length > 0 && connected) {

    const job = queue.shift();

    send(job);

  }

}

/* ---------------- SEND ---------------- */

function send(job) {

  const correlationId = uuidv4();

  pending.set(correlationId, job);

  ws.send(JSON.stringify({

    type: "run",

    agent: job.agent,

    userId: job.session,
    sessionId: job.session,

    input: job.message,

    correlationId

  }));

  setTimeout(() => {

    if (pending.has(correlationId)) {

      pending.delete(correlationId);

      job.reject(new Error("OpenClaw timeout"));

    }

  }, REQUEST_TIMEOUT);

}

/* ---------------- PUBLIC API ---------------- */

function sendToAgent(agent, session, message, options = {}) {

  return new Promise((resolve, reject) => {

    const job = {
      agent,
      session,
      message,
      resolve,
      reject,
      onToken: options.onToken
    };

    if (!connected) {

      log("queue message (not connected)");

      queue.push(job);

      connect();

      return;

    }

    send(job);

  });

}

/* ---------------- HEALTH CHECK ---------------- */

setInterval(() => {

  if (!ws) return;

  if (ws.readyState !== WebSocket.OPEN) {

    log("health check failed → reconnecting");

    connected = false;

    connect();

  }

}, 15000);

/* start connection */

connect();

module.exports = { sendToAgent };
