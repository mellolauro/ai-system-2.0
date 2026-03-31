const { ask } = require('./src/services/openclawClient');

async function test() {
    console.log("🔗 Testando conexão HTTP...");
    try {
        const resposta = await ask({ text: "Oi, você está me ouvindo via HTTP?" });
        console.log("🧠 Resposta do Gemini:", resposta);
        console.log("✅ SUCESSO TOTAL!");
    } catch (e) {
        console.error("❌ FALHA:", e.message);
    }
}

test();
