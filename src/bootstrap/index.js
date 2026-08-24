const loadProviders = require("./providers");
const loadAgents = require("./agents");
const loadTools = require("./tools");
const loadPrompts = require("./prompts");
const loadMemory = require("./memory");
const loadSessions = require("./sessions");

module.exports = async function bootstrap() {

    await loadProviders();

    await loadAgents();

    await loadTools();

    await loadPrompts();

    await loadMemory();

    await loadSessions();

    console.log("✅ Bootstrap concluído.");

};
