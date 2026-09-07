const sessionManager = require("../../src/core/SessionManager");
const contextBuilder = require("../../src/core/ContextBuilder");
const chatPipeline = require("../../src/core/ChatPipeline");

describe("ChatPipeline & SessionManager - Testes de Transbordo e Histórico", () => {
    const tenantMock = {
        id: "tenant_empresa_abc",
        name: "Tech Solutions",
        enabledTools: ["get_invoice", "reset_password"]
    };

    let session;

    beforeEach(() => {
        session = sessionManager.create({
            tenantId: tenantMock.id,
            channel: "api",
            externalUser: "user_456",
            agent: "sales"
        });
    });

    afterEach(() => {
        sessionManager.close({
            tenantId: tenantMock.id,
            channel: "api",
            externalUser: "user_456"
        });
    });

    test("Deve preservar o histórico acumulado durante a troca de agente via setAgent", () => {
        // Mensagens no fluxo de vendas
        sessionManager.addMessage(session, { role: "user", content: "Olá, boa tarde!" });
        sessionManager.addMessage(session, { role: "assistant", content: "Olá! Como posso ajudar?" });

        // Simula a transição para suporte
        sessionManager.setAgent(session, "support", "solicitacao_suporte");

        // Mensagem no fluxo de suporte
        sessionManager.addMessage(session, { role: "user", content: "Meu sistema está travando." });

        const history = sessionManager.getHistory(session);

        // Valida presunção de histórico: 3 mensagens + marcador do sistema
        expect(history.length).toBe(4);
        expect(history[0].content).toBe("Olá, boa tarde!");
        expect(history[history.length - 1].content).toBe("Meu sistema está travando.");
    });

    test("Deve formatar corretamente a interpolação no ContextBuilder com dados do Tenant", () => {
        const promptTemplate = "Você é o assistente virtual da {{companyName}}.";
        const contextData = { tenant: tenantMock, companyName: tenantMock.name };

        const result = contextBuilder.interpolate(promptTemplate, contextData);

        expect(result).toBe("Você é o assistente virtual da Tech Solutions.");
    });
});
