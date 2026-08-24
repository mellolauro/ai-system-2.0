module.exports = {

    id: "aiData",

    name: "AI Data Agent",

    description:
        "Especialista em indicadores e análise de dados.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: false,

    permissions: [
        "dashboard.read",
        "orders.read",
        "products.read"
    ]
};
