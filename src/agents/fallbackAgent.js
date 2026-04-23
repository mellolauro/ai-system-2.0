const { ask } = require("../services/openclawClient");

async function run({ text }) {
    return ask({
        text,
        agent: "main"
    });
}

module.exports = { run };
