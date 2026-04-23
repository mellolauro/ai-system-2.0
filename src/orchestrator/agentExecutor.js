const agents = require("../agents");

async function executeAgent({ agentName, context }) {
    const agent = agents[agentName];

    if (!agent) {
        throw new Error(`Agent não encontrado: ${agentName}`);
    }

    return agent.run(context);
}

module.exports = { executeAgent };
