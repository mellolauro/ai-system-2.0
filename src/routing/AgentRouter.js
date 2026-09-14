const AgentRegistry =
    require("../core/AgentRegistry");

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
        if (
            agentContext ===
            "admin"
        ) {

            if (
                user?.role !==
                "ADMIN"
            ) {

                throw new Error(
                    "Usuário não possui permissão administrativa."
                );

            }

            return this.getAgent(
                "admin"
            );

        }


        /*
         * ==========================================
         * CONTEXTO NORMAL DO CLIENTE
         * ==========================================
         *
         * Se não existir mensagem textual,
         * preservamos o agente ativo da sessão.
         */
        if (
            !message ||
            typeof message !==
                "string"
        ) {

            return this.resolveSessionAgent(
                session
            );

        }


        const text =
            this.normalizeText(
                message
            );


        /*
         * ==========================================
         * 1. TRANSFERÊNCIAS EXPLÍCITAS
         * ==========================================
         *
         * Transferências solicitadas diretamente
         * pelo cliente possuem prioridade sobre
         * a classificação normal da mensagem.
         *
         * Exemplos:
         *
         * "quero falar com vendas"
         * "pode passar para o setor de vendas"
         * "sim, pode continuar com o agente de vendas"
         * "quero falar com suporte"
         *
         * Isso evita que o agente apenas DIGA que
         * transferiu sem que a sessão realmente
         * mude de agente.
         */


        // ------------------------------------------
        // TRANSFERÊNCIA EXPLÍCITA PARA VENDAS
        // ------------------------------------------

        const wantsSalesTransfer =
            this.matchesAnyPhrase(
                text,
                [

                    "falar com vendas",
                    "falar com o vendas",
                    "falar com setor de vendas",
                    "falar com o setor de vendas",

                    "falar com comercial",
                    "falar com o comercial",
                    "falar com setor comercial",
                    "falar com o setor comercial",

                    "agente de vendas",
                    "agente vendas",
                    "atendente de vendas",

                    "passar para vendas",
                    "passar pro vendas",
                    "passar para o vendas",

                    "passar para o setor de vendas",
                    "passar pro setor de vendas",

                    "transferir para vendas",
                    "transferir pro vendas",

                    "transferir para o setor de vendas",
                    "transferir pro setor de vendas",

                    "encaminhar para vendas",
                    "encaminhar pro vendas",

                    "encaminhar para o setor de vendas",
                    "encaminhar pro setor de vendas",

                    "continuar com vendas",
                    "continuar com o vendas",

                    "continuar com agente de vendas",
                    "continuar com o agente de vendas",

                    "continuar com setor de vendas",
                    "continuar com o setor de vendas",

                    "dar continuidade ao agente de vendas",
                    "dar continuidade com agente de vendas",

                    "quero vendas",
                    "quero o setor de vendas",
                    "quero setor de vendas",

                    "setor de vendas",
                    "departamento de vendas",

                    "area comercial",
                    "setor comercial",

                    "quero comprar com vendas"

                ]
            );

        if (
            wantsSalesTransfer
        ) {

            return this.getAgent(
                "sales"
            );

        }


        // ------------------------------------------
        // TRANSFERÊNCIA EXPLÍCITA PARA SUPORTE
        // ------------------------------------------

        const wantsSupportTransfer =
            this.matchesAnyPhrase(
                text,
                [

                    "falar com suporte",
                    "falar com o suporte",

                    "falar com atendimento",
                    "falar com o atendimento",

                    "falar com setor de suporte",
                    "falar com o setor de suporte",

                    "agente de suporte",
                    "atendente de suporte",

                    "passar para suporte",
                    "passar pro suporte",

                    "passar para o suporte",
                    "passar pro atendimento",

                    "transferir para suporte",
                    "transferir pro suporte",

                    "encaminhar para suporte",
                    "encaminhar pro suporte",

                    "continuar com suporte",
                    "continuar com o suporte",

                    "continuar com agente de suporte",
                    "continuar com o agente de suporte",

                    "setor de suporte",
                    "departamento de suporte"

                ]
            );

        if (
            wantsSupportTransfer
        ) {

            return this.getAgent(
                "support"
            );

        }


        /*
         * ==========================================
         * 2. CANCELAMENTO, DÚVIDAS E PÓS-VENDA
         * ==========================================
         *
         * Problemas, cancelamentos, status,
         * rastreamento e atendimento técnico têm
         * prioridade sobre intenções comerciais.
         */
        const isSupportOrPostSales =
            this.matches(
                text,
                [

                    // Cancelamentos / desistências
                    "cancelar",
                    "cancele",
                    "cancelamento",
                    "desistir",

                    // Pós-venda / status / trocas
                    "status",
                    "onde esta",
                    "rastreio",
                    "rastrear",
                    "rastreamento",
                    "entrega",
                    "atraso",
                    "troca",
                    "devolucao",
                    "devolver",
                    "garantia",

                    // Problemas técnicos / reclamações
                    "erro",
                    "falha",
                    "bug",
                    "suporte",
                    "nao funciona",
                    "problema",
                    "defeito"

                ]
            );

        if (
            isSupportOrPostSales
        ) {

            return this.getAgent(
                "support"
            );

        }


        /*
         * ==========================================
         * 3. INTENÇÕES DE DADOS / ANALYTICS
         * ==========================================
         */
        const isDataOrAnalytics =
            this.matches(
                text,
                [

                    "dashboard",
                    "grafico",
                    "indicador",
                    "indicadores",
                    "relatorio",
                    "analytics",
                    "metrica",
                    "metricas",
                    "faturamento"

                ]
            );

        if (
            isDataOrAnalytics
        ) {

            return this.getAgent(
                "aiData"
            );

        }


        /*
         * ==========================================
         * 4. INTENÇÕES COMERCIAIS / VENDAS
         * ==========================================
         *
         * Cobre intenção comercial sem depender
         * do nome de produtos específicos.
         */
        const isSales =
            this.matches(
                text,
                [

                    // Identificação direta do setor
                    "vendas",
                    "comercial",

                    // Compra / contratação
                    "comprar",
                    "compra",
                    "quero comprar",
                    "vou levar",
                    "quero levar",

                    "contratar",
                    "agendar",
                    "agendamento",
                    "marcar",
                    "reservar",

                    "orcamento",
                    "cotacao",

                    // Finalização comercial
                    "finalizar compra",
                    "fechar compra",
                    "fechar pedido",
                    "finalizar pedido",

                    // Termos comerciais
                    "preco",
                    "valor",
                    "quanto custa",
                    "tabela",
                    "catalogo",
                    "estoque",
                    "disponivel",
                    "disponibilidade",
                    "carrinho",

                    "vender",
                    "vende",
                    "vendem",

                    "plano",
                    "pacote",

                    "servico",
                    "servicos",

                    "produto",
                    "produtos"

                ]
            );

        if (
            isSales
        ) {

            return this.getAgent(
                "sales"
            );

        }


        /*
         * ==========================================
         * 5. MENSAGEM GENÉRICA
         * ==========================================
         *
         * Exemplos:
         *
         * "oi"
         * "sim"
         * "certo"
         * "pode continuar"
         *
         * Nesses casos NÃO recalculamos o contexto.
         * Mantemos o agente atualmente responsável
         * pela conversa.
         *
         * Portanto:
         *
         * Support
         *   ↓
         * "quero falar com vendas"
         *   ↓
         * Sales
         *   ↓
         * "oi"
         *   ↓
         * continua Sales
         */
        return this.resolveSessionAgent(
            session
        );

    }


    /*
     * ==========================================
     * RESOLVE AGENTE ATIVO DA SESSÃO
     * ==========================================
     */
    resolveSessionAgent(
        session
    ) {

        if (
            session &&
            session.agent &&
            AgentRegistry.has(
                session.agent
            )
        ) {

            return AgentRegistry.get(
                session.agent
            );

        }

        /*
         * SessionManager cria novas sessões
         * inicialmente com "sales".
         *
         * O fallback abaixo só será utilizado
         * se a sessão estiver ausente ou
         * inconsistente.
         */
        return this.getAgent(
            "fallback"
        );

    }


    /*
     * ==========================================
     * OBTÉM AGENTE DO REGISTRY
     * ==========================================
     */
    getAgent(
        id
    ) {

        const agent =
            AgentRegistry.get(
                id
            );

        if (!agent) {

            throw new Error(
                `Agent "${id}" não encontrado.`
            );

        }

        return agent;

    }


    /*
     * ==========================================
     * NORMALIZAÇÃO DO TEXTO
     * ==========================================
     *
     * Remove acentos, espaços duplicados e
     * converte para minúsculas.
     *
     * Exemplo:
     *
     * "Quero Falar com VENDAS!"
     *
     * vira:
     *
     * "quero falar com vendas!"
     */
    normalizeText(
        value
    ) {

        return String(
            value || ""
        )
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    }


    /*
     * ==========================================
     * CORRESPONDÊNCIA GENÉRICA
     * ==========================================
     */
    matches(
        text,
        keywords
    ) {

        return keywords.some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    }


    /*
     * ==========================================
     * CORRESPONDÊNCIA DE TRANSFERÊNCIA
     * ==========================================
     *
     * Separada de matches() para deixar claro
     * semanticamente que essas frases representam
     * uma intenção forte de handoff.
     */
    matchesAnyPhrase(
        text,
        phrases
    ) {

        return phrases.some(
            phrase =>
                text.includes(
                    phrase
                )
        );

    }

}

module.exports =
    new AgentRouter();
