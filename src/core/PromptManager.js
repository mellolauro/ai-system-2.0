const fs = require("fs");
const path = require("path");

class PromptManager {

    constructor() {

        this.cache = new Map();

    }

    load(agent) {

        if (!agent)
            throw new Error("Agent inválido.");

        const file = path.resolve(
            agent.basePath,
            agent.prompt
        );

        if (this.cache.has(file)) {
            return this.cache.get(file);
        }

        const prompt = fs.readFileSync(file, "utf8");

        this.cache.set(file, prompt);

        return prompt;

    }

    clearCache() {

        this.cache.clear();

    }

}

module.exports = new PromptManager();
