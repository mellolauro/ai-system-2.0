class ContextBuilder {

    build({

        agent,

        prompt,

        session,

        history = [],

        memory = [],

        userMessage,

        metadata = {}

    }) {

        const messages = [

            ...this.buildSystem(prompt),

            ...this.buildMemory(memory),

            ...this.buildHistory(history),

            ...this.buildUser(userMessage)

        ];

        return {

            session,

            provider: agent.getProvider(),

            model: agent.getModel(),

            temperature: agent.getTemperature(),

            maxTokens: agent.getMaxTokens(),

            agent: agent.getId(),

            messages,

            metadata: this.buildMetadata(
                agent,
                metadata
            )

        };

    }

    buildSystem(prompt) {

        if (!prompt) {

            return [];

        }

        return [

            {

                role: "system",

                content: prompt

            }

        ];

    }

    buildMemory(memory) {

        if (!memory.length) {

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

    buildMetadata(agent, metadata) {

        return {

            agent: agent.getId(),

            version: agent.getVersion(),

            timestamp:
                new Date().toISOString(),

            ...metadata

        };

    }

}

module.exports = new ContextBuilder();
