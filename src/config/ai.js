module.exports = {

    provider: process.env.DEFAULT_PROVIDER || "openclaw",

    model: process.env.DEFAULT_MODEL || "google/gemini-2.5-flash",

    temperature: Number(
        process.env.DEFAULT_TEMPERATURE || 0.4
    ),

    maxTokens: Number(
        process.env.DEFAULT_MAX_TOKENS || 4096
    ),

    timeout: Number(
        process.env.DEFAULT_TIMEOUT || 60000
    )

};
