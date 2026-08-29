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

                tenant

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

    buildSystem(
        prompt,
        tenant
    ) {

        const messages = [];

        /*
         * Prompt fixo do agente.
         */
        if (prompt) {

            messages.push({

                role:
                    "system",

                content:
                    prompt

            });

        }

        /*
         * Contexto dinâmico do tenant.
         *
         * Não colocamos isso no prompt.md
         * porque o nome da empresa depende
         * do tenant da requisição.
         */
        if (
            tenant &&
            tenant.name
        ) {

            messages.push({

                role:
                    "system",

                content:
                    [
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

                role:
                    "system",

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

                role:
                    "user",

                content:
                    message

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

module.exports =
    new ContextBuilder();
