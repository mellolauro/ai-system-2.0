class Provider {

    constructor(config = {}) {

        this.name = config.name || "provider";

    }

    async initialize() {

        return true;

    }

    async generate(request) {

        throw new Error(
            `${this.name}: generate() não implementado`
        );

    }

    async stream(request) {

        throw new Error(
            `${this.name}: stream() não implementado`
        );

    }

    async embeddings(request) {

        throw new Error(
            `${this.name}: embeddings() não implementado`
        );

    }

    async health() {

        return {

            provider: this.name,

            status: "unknown"

        };

    }

}

module.exports = Provider;
