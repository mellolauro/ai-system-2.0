const WebSocket = require('ws');
const url = 'ws://127.0.0.1:18789'; // Teste sem o /ws primeiro

const ws = new WebSocket(url, {
  headers: { "Origin": "http://127.0.0.1:18789" }
});

ws.on('open', () => {
  console.log('Conectado! Enviando teste...');
  ws.send(JSON.stringify({
    type: "command",
    command: "agent.run",
    id: "teste-123",
    payload: { agent: "main", messages: [{ role: "user", content: "Oi" }] }
  }));
});

ws.on('message', (data) => console.log('Resposta:', data.toString()));
ws.on('error', (err) => console.error('Erro:', err.message));
