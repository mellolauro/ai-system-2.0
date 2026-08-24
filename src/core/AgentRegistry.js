class AgentRegistry {

    constructor() {
        this.agents = new Map();
    }

    register(agent) {

        this.agents.set(agent.getId(), agent);

    }

    get(id) {

        return this.agents.get(id);

    }

    has(id) {

        return this.agents.has(id);

    }

    remove(id) {

        this.agents.delete(id);

    }

    clear() {

        this.agents.clear();

    }

    list() {

        return [...this.agents.values()];

    }

}

module.exports = new AgentRegistry();
