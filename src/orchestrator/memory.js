const memory = new Map();

function getMemory(sessionId) {
    return memory.get(sessionId) || [];
}

function saveMemory(sessionId, message) {
    const history = memory.get(sessionId) || [];
    history.push(message);

    // mantém só últimos 10
    if (history.length > 10) history.shift();

    memory.set(sessionId, history);
}

module.exports = { getMemory, saveMemory };
