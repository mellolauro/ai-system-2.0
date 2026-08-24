class ProviderManager {

    constructor() {

        this.providers = new Map();

        this.defaultProvider = null;

    }

    register(provider) {

        if (!provider || !provider.name) {

            throw new Error(
                "Provider inválido."
            );

        }

        this.providers.set(
            provider.name,
            provider
        );

    }

    get(name) {

        return this.providers.get(name);

    }

    setDefault(name) {

        if (!this.providers.has(name)) {

            throw new Error(
                `Provider "${name}" não registrado.`
            );

        }

        this.defaultProvider = name;

    }

    resolve(name = null) {

        const providerName =
            name || this.defaultProvider;

        if (!providerName) {

            throw new Error(
                "Nenhum provider definido."
            );

        }

        const provider =
            this.providers.get(providerName);

        if (!provider) {

            throw new Error(
                `Provider "${providerName}" não encontrado.`
            );

        }

        return provider;

    }

    current() {

        return this.resolve();

    }

    async initialize() {

        for (
            const provider
            of this.providers.values()
        ) {

            if (
                typeof provider.initialize === "function"
            ) {

                await provider.initialize();

            }

        }

    }

    async execute(request = {}) {

        const provider =
            this.resolve(request.provider);

        return provider.generate(request);

    }

    async generate(request = {}) {

        return this.execute(request);

    }

    async stream(request = {}) {

        const provider =
            this.resolve(request.provider);

        return provider.stream(request);

    }

    async health() {

        const status = [];

        for (
            const provider
            of this.providers.values()
        ) {

            status.push(
                await provider.health()
            );

        }

        return status;

    }

}

module.exports = new ProviderManager();
