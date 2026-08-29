module.exports = {

    id: "support",

    name: "Support Agent",

    description:
        "Especialista em suporte técnico, atendimento ao cliente e solicitações relacionadas a pedidos.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: true,

    permissions: [

        "orders.read",

        "orders.cancel",

        "products.read"

    ]

};
