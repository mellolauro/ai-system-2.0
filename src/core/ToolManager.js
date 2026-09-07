const path = require("path");
const fs = require("fs");
const { deliveryToolsDefinitions, handleDeliveryTool } = require("../tools/deliveryTools");

class ToolManager {
    constructor() {
        this.tools = new Map();

        // Auto-registro das tools de entrega no bootstrap
        this.registerDeliveryTools();
    }

    registerDeliveryTools() {
        if (!Array.isArray(deliveryToolsDefinitions)) return;

        for (const def of deliveryToolsDefinitions) {
            // Suporta formatos com ou sem chave 'function'
            const toolFn = def.function || def;

            if (!toolFn || !toolFn.name) continue;

            this.register(toolFn.name, {
                name: toolFn.name,
                description: toolFn.description || "",
                schema: toolFn.parameters || toolFn.schema || {},
                execute: async (params, context) => {
                    return await handleDeliveryTool({
                        name: toolFn.name,
                        args: params,
                        context
                    });
                }
            });
        }
    }

    register(name, tool) {
        if (!name) {
            throw new Error("Nome da Tool é obrigatório.");
        }

        if (!tool) {
            throw new Error(`Tool "${name}" inválida.`);
        }

        if (typeof tool.execute !== "function") {
            throw new Error(`Tool "${name}" não possui execute().`);
        }

        this.tools.set(name, tool);
    }

    get(name) {
        return this.tools.get(name);
    }

    has(name) {
        return this.tools.has(name);
    }

    list() {
        return [...this.tools.keys()];
    }

    /**
     * Retorna a lista de ferramentas permitidas para o agente,
     * considerando as ferramentas habilitadas pelo Tenant no contexto.
     */
    getTools(agent, context = {}) {
        if (!agent) return [];

        const agentToolNames = agent.getTools();
        if (!Array.isArray(agentToolNames)) return [];

        // Recupera permissões/módulos/ferramentas ativos do Tenant
        const enabledTenantTools = context.tenant?.enabledTools || null;

        return agentToolNames
            .map(toolName => (typeof toolName === "string" ? this.get(toolName) : toolName))
            .filter(Boolean)
            .filter(tool => {
                // Se o Tenant tiver uma lista restritiva de ferramentas ativas, valida a interseção
                if (Array.isArray(enabledTenantTools)) {
                    return enabledTenantTools.includes(tool.name);
                }
                return true;
            });
    }

    /**
     * Converte as Tools internas do AI-System para o formato de Function Calling do LLM.
     * Repassa o contexto do Tenant para getTools.
     * 
     * Campos controlados pelo Kernel (tenantId, userId, sessionId, channel)
     * são removidos do schema enviado ao LLM por segurança.
     */
    getDefinitions(agent, context = {}) {
        const tools = this.getTools(agent, context);

        return tools.map(tool => {
            const schema = tool.schema || {
                type: "object",
                properties: {},
                additionalProperties: false
            };

            const properties = {
                ...(schema.properties || {})
            };

            const required = Array.isArray(schema.required)
                ? [...schema.required]
                : [];

            /*
             * Campos controlados exclusivamente pelo Kernel.
             */
            const trustedFields = [
                "tenantId",
                "userId",
                "sessionId",
                "channel"
            ];

            for (const field of trustedFields) {
                delete properties[field];

                const index = required.indexOf(field);
                if (index !== -1) {
                    required.splice(index, 1);
                }
            }

            return {
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description || "",
                    parameters: {
                        ...schema,
                        type: schema.type || "object",
                        properties,
                        required,
                        additionalProperties: schema.additionalProperties ?? false
                    }
                }
            };
        });
    }

    async execute(name, params = {}, context = {}) {
        const tool = this.get(name);

        if (!tool) {
            throw new Error(`Tool "${name}" não encontrada.`);
        }

        /*
         * Parâmetros enviados pelo LLM.
         */
        const safeParams = {
            ...params
        };

        /*
         * Injeção de contexto confiável da aplicação.
         */
        if (context.tenantId !== undefined) {
            safeParams.tenantId = context.tenantId;
        }

        if (context.userId !== undefined) {
            safeParams.userId = context.userId;
        }

        if (context.sessionId !== undefined) {
            safeParams.sessionId = context.sessionId;
        }

        if (context.channel !== undefined) {
            safeParams.channel = context.channel;
        }

        /*
         * Validação de permissões da Tool contra o perfil do agente/usuário.
         */
        if (Array.isArray(tool.permissions) && tool.permissions.length > 0) {
            const agentPermissions = Array.isArray(context.permissions)
                ? context.permissions
                : [];

            const authorized = tool.permissions.every(permission =>
                agentPermissions.includes(permission)
            );

            if (!authorized) {
                throw new Error(
                    `Agente não possui permissão para executar "${name}".`
                );
            }
        }

        /*
         * Executa a Tool enviando o contexto confiável.
         */
        return tool.execute(safeParams, context);
    }

    load(directory) {
        if (!fs.existsSync(directory)) {
            return;
        }

        const walk = dir => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    walk(fullPath);
                    continue;
                }

                if (!file.endsWith(".js")) {
                    continue;
                }

                // Ignora utilitários, loaders e arquivos de seed/teste
                if (
                    file === "Loader.js" ||
                    file.startsWith("seed") ||
                    file.startsWith("test")
                ) {
                    continue;
                }

                delete require.cache[require.resolve(fullPath)];

                const tool = require(fullPath);

                if (
                    !tool ||
                    !tool.name ||
                    typeof tool.execute !== "function"
                ) {
                    continue;
                }

                this.register(tool.name, tool);

                console.log(`🔧 Tool carregada: ${tool.name}`);
            }
        };

        walk(directory);
    }
}

module.exports = new ToolManager();
