const { routeAgent } = require("./agentRouter");
const { executeAgent } = require("./agentExecutor");
const { getMemory, saveMemory } = require("./memory");

async function handleMessage({
    text,
    sessionId,
    tenantId,
    user,
    session
}) {
    const memory = getMemory(sessionId);

    const agentName = await routeAgent({ text, tenantId });

    console.log(`🤖 Agent escolhido: ${agentName}`);

    const response = await executeAgent({
        agentName,
        context: {
            text,
            memory,
            sessionId,
            tenantId,
            user,
            session
        }
    });

    saveMemory(sessionId, `User: ${text}`);
    saveMemory(sessionId, `Bot: ${response}`);

    return response;
}

module.exports = { handleMessage };
