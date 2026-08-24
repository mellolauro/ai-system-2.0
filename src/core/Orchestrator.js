const ChatPipeline = require("./ChatPipeline");

class Orchestrator {

    async execute(request) {

        return ChatPipeline.execute(request);

    }

}

module.exports = new Orchestrator();
