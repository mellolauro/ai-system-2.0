const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

/**
 * Realiza buscas contextuais na web para suporte de produtos/dúvidas do TechnoShopping
 * @param {string} query - Pergunta ou termo enviado pelo cliente
 */
async function searchWeb(query) {
  try {
    const response = await tvly.search(query, {
      searchDepth: "basic",
      maxResults: 3,
      includeAnswer: true
    });

    return {
      success: true,
      answer: response.answer || null,
      results: response.results.map(r => ({ title: r.title, content: r.content, url: r.url }))
    };
  } catch (error) {
    console.error("[Tavily] Erro ao realizar busca:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { searchWeb };
