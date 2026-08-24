class Agent {

    constructor(config = {}) {

        this.id = config.id;

        this.name = config.name;

        this.description = config.description || "";

        // Caminho do prompt (.md)
        this.prompt = config.prompt || "";

        // Diretório do agente
        this.basePath = config.basePath || "";

        // Lista de ferramentas
        this.tools = Array.isArray(config.tools)
            ? config.tools
            : [];

        // Configuração do modelo
        this.provider = config.provider || null;

        this.model = config.model || null;

        this.temperature = config.temperature ?? 0.7;

        this.maxTokens = config.maxTokens ?? 4096;

        // Recursos
        this.memory = config.memory !== false;

        this.permissions = config.permissions || [];

        // Controle do agente
        this.enabled = config.enabled !== false;

        this.version = config.version || "1.0.0";

        this.metadata = config.metadata || {};

    }

    /* =======================================================
       Informações básicas
    ======================================================= */

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    getPromptPath() {
        return this.prompt;
    }

    getBasePath() {
        return this.basePath;
    }

    /* =======================================================
       Modelo
    ======================================================= */

    getProvider() {
        return this.provider;
    }

    getModel() {
        return this.model;
    }

    getTemperature() {
        return this.temperature;
    }

    getMaxTokens() {
        return this.maxTokens;
    }

    /* =======================================================
       Ferramentas
    ======================================================= */

    getTools() {
        return this.tools;
    }

    hasTool(name) {

        return this.tools.some(tool => {

            if (typeof tool === "string") {
                return tool === name;
            }

            return tool.name === name;

        });

    }

    addTool(tool) {

        this.tools.push(tool);

    }

    removeTool(name) {

        this.tools = this.tools.filter(tool => {

            if (typeof tool === "string") {
                return tool !== name;
            }

            return tool.name !== name;

        });

    }

    /* =======================================================
       Permissões
    ======================================================= */

    getPermissions() {
        return this.permissions;
    }

    hasPermission(permission) {

        return this.permissions.includes(permission);

    }

    /* =======================================================
       Recursos
    ======================================================= */

    hasMemory() {
        return this.memory;
    }

    isEnabled() {
        return this.enabled;
    }

    getVersion() {
        return this.version;
    }

    getMetadata() {
        return this.metadata;
    }

    /* =======================================================
       Serialização
    ======================================================= */

    toJSON() {

        return {

            id: this.id,

            name: this.name,

            description: this.description,

            prompt: this.prompt,

            basePath: this.basePath,

            provider: this.provider,

            model: this.model,

            temperature: this.temperature,

            maxTokens: this.maxTokens,

            memory: this.memory,

            permissions: this.permissions,

            tools: this.tools,

            enabled: this.enabled,

            version: this.version,

            metadata: this.metadata

        };

    }

}

module.exports = Agent;
