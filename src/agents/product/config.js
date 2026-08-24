module.exports = {

    id: "product",

    name: "Product Agent",

    description:
        "Especialista em catálogo de produtos.",

    prompt: "./prompt.md",

    tools: "./tools.js",

    memory: false,

    permissions: [
        "products.read"
    ]
};
