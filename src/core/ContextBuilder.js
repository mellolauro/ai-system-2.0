class ContextBuilder {

    build({
        agent,
        prompt,
        session,
        history = [],
        memory = [],
        userMessage,
        metadata = {},
        tenant = null,
        user = null
    }) {
        const messages = [
            ...this.buildSystem(
                prompt,
                tenant,
                user
            ),

            ...this.buildMemory(
                memory
            ),

            ...this.buildHistory(
                history
            ),

            ...this.buildUser(
                userMessage
            )
        ];

        return {
            session,

            provider:
                agent.getProvider(),

            model:
                agent.getModel(),

            temperature:
                agent.getTemperature(),

            maxTokens:
                agent.getMaxTokens(),

            agent:
                agent.getId(),

            messages,

            metadata:
                this.buildMetadata(
                    agent,
                    metadata,
                    tenant,
                    user
                )
        };
    }

    /**
     * Interpola variáveis no formato {{caminho.da.propriedade}}
     * Exemplo: {{tenant.name}}, {{companyName}}, {{user.name}}
     */
    interpolate(template, data = {}) {
        if (!template || typeof template !== "string") return "";

        return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, keyPath) => {
            const keys = keyPath.split(".");
            let value = data;

            for (const key of keys) {
                if (value && typeof value === "object" && key in value) {
                    value = value[key];
                } else {
                    value = null;
                    break;
                }
            }

            return value !== null && value !== undefined ? String(value) : match;
        });
    }

    buildSystem(
        prompt,
        tenant,
        user
    ) {
        const messages = [];

        /*
         * Prepara os dados de contexto disponíveis para substituição nos placeholders.
         */
        const contextData = {
            tenant: tenant || {},
            user: user || {},
            // Aliases diretos para facilidade de uso em prompts legados
            companyName: tenant?.name || "",
            tenantName: tenant?.name || "",
            userName: user?.name || ""
        };

        /*
         * Prompt fixo do agente com substituição dinâmica de placeholders.
         */
        if (prompt) {
            const interpolatedPrompt = this.interpolate(prompt, contextData);

            messages.push({
                role: "system",
                content: interpolatedPrompt
            });
        }

        /*
         * Contexto dinâmico adicional do tenant (fallback / bloco fixo).
         */
        if (tenant && tenant.name) {
            messages.push({
                role: "system",
                content: [
                    "CONTEXTO DA EMPRESA",
                    `Nome da empresa: ${tenant.name}`
                ].join("\n")
            });
        }

        return messages;
    }

    buildMemory(memory) {
        if (
            !Array.isArray(memory) ||
            !memory.length
        ) {
            return [];
        }

        return [
            {
                role: "system",
                content:
                    "Memória conhecida:\n\n" +
                    memory.join("\n")
            }
        ];
    }

    buildHistory(history) {
        return Array.isArray(history)
            ? history
            : [];
    }

    buildUser(message) {
        if (!message) {
            return [];
        }

        return [
            {
                role: "user",
                content: message
            }
        ];
    }

    buildMetadata(
        agent,
        metadata,
        tenant,
        user
    ) {
        return {
            agent:
                agent.getId(),

            version:
                agent.getVersion(),

            timestamp:
                new Date().toISOString(),

            tenantName:
                tenant?.name ||
                null,

            userRole:
                user?.role ||
                null,

            ...metadata
        };
    }
}

module.exports = new ContextBuilder();
