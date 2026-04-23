const { ask } = require("../services/openclawClient");

async function generateFinalResponse({ raw, memory }) {

  return await ask({
    text: `
Transforme isso em uma resposta natural, humana e persuasiva:

${raw}

Memória do cliente:
${JSON.stringify(memory)}
`
  });
}

module.exports = { generateFinalResponse };
