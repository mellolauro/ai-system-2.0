module.exports = {

    id: "support",

    name: "Support Agent",

    description:
        "Especialista em suporte técnico e atendimento.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: true,

    permissions: [
        "orders.read",
        "products.read"
    ]
};
