const OpenClawProvider = require("../providers/OpenClawProvider");
const ProviderManager = require("../providers/ProviderManager");

const aiConfig = require("../config/ai");

module.exports = async function loadProviders() {

    console.log("🔌 Inicializando providers...");

    const openclaw = new OpenClawProvider({

        name: "openclaw",

        baseUrl: process.env.OPENCLAW_URL,

        token: process.env.OPENCLAW_TOKEN,

        defaultModel: aiConfig.model,

        openRouterKey: process.env.OPENROUTER_API_KEY

    });

    ProviderManager.register(openclaw);

    ProviderManager.setDefault(
        aiConfig.provider
    );

    await ProviderManager.initialize();

    console.log(
        `✅ Provider padrão: ${aiConfig.provider}`
    );

};
