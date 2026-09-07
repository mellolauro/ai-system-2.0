const AgentRegistry = require("../core/AgentRegistry");

class AgentRouter {

    async resolve({
        message,
        session,
        user,
        agentContext = "client"
    }) {

        /*
         * ==========================================
         * CONTEXTO ADMINISTRATIVO EXPLÍCITO
         * ==========================================
         */
        if (agentContext === "admin") {
            if (user?.role !== "ADMIN") {
                throw new Error("Usuário não possui permissão administrativa.");
            }
            return this.getAgent("admin");
        }

        /*
         * ==========================================
         * CONTEXTO NORMAL DO CLIENTE
         * ==========================================
         */
        if (!message || typeof message !== "string") {
            return this.resolveSessionAgent(session);
        }

        const text = message
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        /*
         * ==========================================
         * 1. CANCELAMENTO, DÚVIDAS E PÓS-VENDA (SUPPORT)
         * ==========================================
         * Captura problemas, cancelamentos, status de 
         * pedidos e atendimento técnico antes de Vendas.
         */
        const isSupportOrPostSales = this.matches(text, [
            // Cancelamentos / Desistências
            "cancelar", "cancele", "cancelamento", "desistir",
            
            // Pós-venda / Status / Trocas
            "status", "onde esta", "rastreio", "rastrear", "entrega",
            "atraso", "troca", "devolucao", "devolver", "garantia",
            
            // Problemas Técnicos / Reclamações
            "erro", "falha", "bug", "suporte", "nao funciona",
            "problema", "defeito", "ajuda"
        ]);

        if (isSupportOrPostSales) {
            return this.getAgent("support");
        }

        /*
         * ==========================================
         * 2. INTENÇÕES DE DADOS / ANALYTICS (AI DATA)
         * ==========================================
         */
        const isDataOrAnalytics = this.matches(text, [
            "dashboard", "grafico", "indicador", "indicadores",
            "relatorio", "analytics", "metricas", "faturamento"
        ]);

        if (isDataOrAnalytics) {
            return this.getAgent("aiData");
        }

        /*
         * ==========================================
         * 3. INTENÇÕES COMERCIAIS / VENDAS (SALES)
         * ==========================================
         * Cobre intenções de compra para PRODUTOS e SERVIÇOS
         * sem fixar nomes de itens específicos no código.
         */
        const isSales = this.matches(text, [
            // Ações de Compra / Contratação
            "comprar", "compra", "contratar", "agendar", "agendamento",
            "marcar", "reservar", "orcamento", "cotacao",
            
            // Termos Comerciais Genéricos
            "preco", "valor", "quanto custa", "tabela", "catalogo",
            "estoque", "disponivel", "disponibilidade", "carrinho",
            "vender", "plano", "pacote", "servico", "servicos", "produto", "produtos"
        ]);

        if (isSales) {
            return this.getAgent("sales");
        }

        /*
         * ==========================================
         * 4. SEM NOVA INTENÇÃO (MANTER SESSÃO/FALLBACK)
         * ==========================================
         */
        return this.resolveSessionAgent(session);
    }

    resolveSessionAgent(session) {
        if (session && session.agent && AgentRegistry.has(session.agent)) {
            return AgentRegistry.get(session.agent);
        }

        return this.getAgent("fallback");
    }

    getAgent(id) {
        const agent = AgentRegistry.get(id);

        if (!agent) {
            throw new Error(`Agent "${id}" não encontrado.`);
        }

        return agent;
    }

    matches(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
}

module.exports = new AgentRouter();
