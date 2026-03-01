const { MODEL_PRIORITY } = require("../config/models");
const openrouter = require("../services/openrouter");

async function generateResponse(messages) {
  for (const model of MODEL_PRIORITY) {
    try {
      const response = await openrouter.chat(model, messages);
      return { response, model };
    } catch (err) {
      console.log(`Model failed: ${model}`, err.message);
    }
  }

  throw new Error("All models failed.");
}

module.exports = { generateResponse };
