module.exports = {
    id: "admin",

    name: "Admin Agent",

    description:
        "Agente administrativo responsável pelo gerenciamento de pedidos, pagamentos, expedição, entrega e cancelamentos.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: true,

    permissions: [
        "orders.read",
        "orders.payment.update",
        "orders.ship",
        "orders.deliver",
        "orders.cancel"
    ]
};
