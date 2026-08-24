const fs = require("fs");
const path = require("path");

const Agent = require("../core/Agent");
const AgentRegistry = require("../core/AgentRegistry");

class AgentLoader {

    load() {

        AgentRegistry.clear();

        const agentsPath = __dirname;

        const directories = fs
            .readdirSync(agentsPath, {
                withFileTypes: true
            })
            .filter(entry => entry.isDirectory());

        for (const directory of directories) {

            const agentDir = path.join(
                agentsPath,
                directory.name
            );

            const configFile = path.join(
                agentDir,
                "config.js"
            );

            if (!fs.existsSync(configFile)) {
                continue;
            }

            delete require.cache[
                require.resolve(configFile)
            ];

            const config = require(configFile);

            /*
             * Diretório base do agente.
             */
            config.basePath = agentDir;

            /*
             * Prompt:
             *
             * O Agent guarda apenas a referência
             * ao arquivo. Quem lê o conteúdo é o
             * PromptManager.
             */
            if (!config.prompt) {

                const defaultPrompt =
                    path.join(
                        agentDir,
                        "prompt.md"
                    );

                if (fs.existsSync(defaultPrompt)) {

                    config.prompt = "./prompt.md";

                }

            }

            /*
             * Tools:
             *
             * config.tools normalmente contém:
             *
             * "./tools.js"
             *
             * O Loader resolve esse arquivo e
             * transforma o manifesto em uma lista:
             *
             * [
             *   "searchProducts",
             *   "getProduct"
             * ]
             */
            if (typeof config.tools === "string") {

                const toolsFile = path.resolve(
                    agentDir,
                    config.tools
                );

                if (fs.existsSync(toolsFile)) {

                    delete require.cache[
                        require.resolve(toolsFile)
                    ];

                    const loadedTools =
                        require(toolsFile);

                    config.tools =
                        Array.isArray(loadedTools)
                            ? loadedTools
                            : [];

                } else {

                    console.warn(
                        `⚠ ${directory.name}: arquivo de tools não encontrado: ${config.tools}`
                    );

                    config.tools = [];

                }

            } else if (!Array.isArray(config.tools)) {

                config.tools = [];

            }

            const agent =
                new Agent(config);

            AgentRegistry.register(agent);

            console.log(
                `✅ Agent carregado: ${agent.getId()}`
            );

        }

        console.log(
            `📦 ${AgentRegistry.list().length} agentes carregados`
        );

    }

}

module.exports = new AgentLoader();
