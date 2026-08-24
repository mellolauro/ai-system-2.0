module.exports = {
    id: "sales",

    name: "Sales Agent",

    description:
        "Especialista em vendas, produtos, negociação e recuperação de carrinho.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: true,

    permissions: [
        "products.read",
        "orders.create",
        "orders.read",
        "cart.read",
        "cart.write"
    ]
};
