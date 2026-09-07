// tests/unit/AgentRouter.test.js
const AgentRouterClass = require("../../src/routing/AgentRouter");
const agentRouter = typeof AgentRouterClass === "function" ? new AgentRouterClass() : AgentRouterClass;

const sessionManager = require("../../src/core/SessionManager");
const agentRegistry = require("../../src/core/AgentRegistry");
const Agent = require("../../src/core/Agent");

describe("AgentRouter - Testes Unitários", () => {
    let mockSession;

    beforeEach(() => {
        const salesAgent = new Agent({ id: "sales", name: "Agente de Vendas" });
        const supportAgent = new Agent({ id: "support", name: "Agente de Suporte" });

        if (typeof agentRegistry.register === "function") {
            agentRegistry.register(salesAgent);
            agentRegistry.register(supportAgent);
        } else if (agentRegistry.agents && agentRegistry.agents instanceof Map) {
            agentRegistry.agents.set("sales", salesAgent);
            agentRegistry.agents.set("support", supportAgent);
        } else if (typeof agentRegistry.add === "function") {
            agentRegistry.add(salesAgent);
            agentRegistry.add(supportAgent);
        }

        mockSession = sessionManager.create({
            tenantId: "tenant_empresa_abc",
            channel: "api",
            externalUser: "user_123",
            agent: "sales"
        });
    });

    afterEach(() => {
        sessionManager.close({
            tenantId: "tenant_empresa_abc",
            channel: "api",
            externalUser: "user_123"
        });

        if (typeof agentRegistry.clear === "function") {
            agentRegistry.clear();
        } else if (agentRegistry.agents && agentRegistry.agents instanceof Map) {
            agentRegistry.agents.clear();
        }
    });

    test("Deve manter o agente 'sales' para intenções comerciais", async () => {
        const userMessage = "Gostaria de saber os preços dos planos de vocês.";

        const result = await agentRouter.resolve({
            session: mockSession,
            message: userMessage
        });

        const targetAgentId = typeof result === "object" && result.getId ? result.getId() : (result.id || result);

        expect(targetAgentId).toBe("sales");
    });

    test("Deve alternar para o agente 'support' quando for detectada solicitação de suporte", async () => {
        const userMessage = "Estou enfrentando um erro no login da plataforma.";

        const result = await agentRouter.resolve({
            session: mockSession,
            message: userMessage
        });

        const targetAgentId = typeof result === "object" && result.getId ? result.getId() : (result.id || result);

        expect(targetAgentId).toBe("support");
    });

    test("Deve registrar a transferência nos metadados da sessão ao atualizar o agente via SessionManager", async () => {
        const userMessage = "Preciso de suporte técnico";

        const result = await agentRouter.resolve({
            session: mockSession,
            message: userMessage
        });

        const targetAgentId = typeof result === "object" && result.getId ? result.getId() : (result.id || result);

        // O pipeline/orquestrador aplica a decisão do router na sessão
        if (targetAgentId !== mockSession.agent) {
            sessionManager.setAgent(mockSession, targetAgentId, "router_decision");
        }

        expect(mockSession.agent).toBe("support");
        expect(mockSession.metadata.transfers).toHaveLength(1);
        expect(mockSession.metadata.transfers[0]).toMatchObject({
            from: "sales",
            to: "support"
        });
    });
});
