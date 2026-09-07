const AgentRouter = require("../src/routing/AgentRouter");
const AgentRegistry = require("../src/core/AgentRegistry");

// Mock simples do AgentRegistry para os testes
jest.mock("../src/core/AgentRegistry", () => {
    const agents = {
        admin: { id: "admin", name: "AdminAgent" },
        sales: { id: "sales", name: "SalesAgent" },
        support: { id: "support", name: "SupportAgent" },
        aiData: { id: "aiData", name: "AiDataAgent" },
        fallback: { id: "fallback", name: "FallbackAgent" }
    };

    return {
        get: jest.fn((id) => agents[id] || null),
        has: jest.fn((id) => Boolean(agents[id]))
    };
});

describe("AgentRouter - Suíte de Roteamento de Intenções", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------------------------------
    // CONTEXTO ADMINISTRATIVO
    // ----------------------------------------------------
    describe("Contexto Admin", () => {
        it("deve rotear para 'admin' quando o contexto for admin e o usuário for ADMIN", async () => {
            const agent = await AgentRouter.resolve({
                message: "Qualquer mensagem",
                user: { role: "ADMIN" },
                agentContext: "admin"
            });
            expect(agent.id).toBe("admin");
        });

        it("deve lançar erro se tentar acessar contexto admin sem a role ADMIN", async () => {
            await expect(
                AgentRouter.resolve({
                    message: "Qualquer mensagem",
                    user: { role: "CLIENT" },
                    agentContext: "admin"
                })
            ).rejects.toThrow("Usuário não possui permissão administrativa.");
        });
    });

    // ----------------------------------------------------
    // PÓS-VENDA & SUPORTE (Produtos e Serviços)
    // ----------------------------------------------------
    describe("Intenções de Suporte e Pós-Venda", () => {
        const supportQueries = [
            "Onde está meu pedido?",
            "Qual o status da minha entrega?",
            "Quero cancelar o serviço contratado",
            "Gostaria de solicitar uma troca ou devolução",
            "Estou com um problema no meu acesso",
            "Preciso de ajuda com um defeito",
            "O sistema apresentou erro ao processar"
        ];

        supportQueries.forEach(query => {
            it(`deve rotear "${query}" para 'support'`, async () => {
                const agent = await AgentRouter.resolve({ message: query });
                expect(agent.id).toBe("support");
            });
        });
    });

    // ----------------------------------------------------
    // COMERCIAL & VENDAS (Produtos e Serviços)
    // ----------------------------------------------------
    describe("Intenções Comerciais (Vendas & Contratação)", () => {
        const salesQueries = [
            // Cenários de Produtos
            "Qual o preço do produto?",
            "Tem esse item em estoque?",
            "Gostaria de ver o catálogo",
            "Qual o valor do frete?",
            "Quero comprar este item",

            // Cenários de Serviços / Agendamentos
            "Quero agendar um horário amanhã",
            "Qual o valor da consulta?",
            "Gostaria de solicitar um orçamento para o serviço",
            "Quais planos e pacotes vocês oferecem?",
            "Como faço para contratar a consultoria?"
        ];

        salesQueries.forEach(query => {
            it(`deve rotear "${query}" para 'sales'`, async () => {
                const agent = await AgentRouter.resolve({ message: query });
                expect(agent.id).toBe("sales");
            });
        });
    });

    // ----------------------------------------------------
    // ANALYTICS & DADOS
    // ----------------------------------------------------
    describe("Intenções de Analytics / Dados", () => {
        const dataQueries = [
            "Me mostre o dashboard de vendas",
            "Qual o faturamento do mês?",
            "Gerar relatório das métricas recentes",
            "Quais são os principais indicadores?"
        ];

        dataQueries.forEach(query => {
            it(`deve rotear "${query}" para 'aiData'`, async () => {
                const agent = await AgentRouter.resolve({ message: query });
                expect(agent.id).toBe("aiData");
            });
        });
    });

    // ----------------------------------------------------
    // SESSÃO & FALLBACK
    // ----------------------------------------------------
    describe("Manutenção de Sessão e Fallback", () => {
        it("deve manter o agente da sessão se a mensagem for genérica (sem intenção clara)", async () => {
            const session = { agent: "sales" };
            const agent = await AgentRouter.resolve({
                message: "Olá, boa tarde!",
                session
            });
            expect(agent.id).toBe("sales");
        });

        it("deve ir para 'fallback' se a mensagem for genérica e não houver sessão ativa", async () => {
            const agent = await AgentRouter.resolve({ message: "Tudo bem?" });
            expect(agent.id).toBe("fallback");
        });

        it("deve priorizar uma nova intenção clara em vez de manter o agente antigo da sessão", async () => {
            const session = { agent: "sales" };
            // Estava em Vendas, mas pediu Suporte/Cancelamento
            const agent = await AgentRouter.resolve({
                message: "Preciso cancelar minha assinatura",
                session
            });
            expect(agent.id).toBe("support");
        });
    });
});
