const tools = require("./registry");

async function executeTool(action, args, context) {

  const tool = tools[action];

  if (!tool) {
    throw new Error("Tool não encontrada: " + action);
  }

  return await tool.execute({
    ...args,
    ...context
  });
}

module.exports = { executeTool };
