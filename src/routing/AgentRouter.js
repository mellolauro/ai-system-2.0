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
         *
         * O usuário precisa ser ADMIN e a requisição
         * precisa solicitar o contexto admin.
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
            message
                .toLowerCase()
                .normalize("NFD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                );

        /*
         * ==========================================
         * 1. CANCELAMENTO DE PEDIDO
         * ==========================================
         *
         * Deve ocorrer ANTES da regra genérica
         * que contém a palavra "pedido".
         *
         * Assim:
         *
         * "Qual o status do meu pedido?"
         *    -> sales
         *
         * "Quero cancelar meu pedido"
         *    -> support
         */

        if (
            this.matches(
                text,
                [

                    "cancelar pedido",

                    "cancele o pedido",

                    "cancelamento do pedido",

                    "cancelamento de pedido",

                    "quero cancelar",

                    "quero cancelar meu pedido",

                    "quero cancelar o pedido",

                    "desistir do pedido",

                    "desistir da compra",

                    "cancelar minha compra",

                    "cancelar o pedido"

                ]
            )
        ) {

            return this.getAgent(
                "support"
            );

        }

        /*
         * ==========================================
         * 2. INTENÇÕES DE DADOS / ANALYTICS
         * ==========================================
         */

        if (
            this.matches(
                text,
                [

                    "dashboard",
                    "grafico",
                    "indicador",
                    "indicadores",
                    "relatorio",
                    "analytics",
                    "metricas",
                    "faturamento"

                ]
            )
        ) {

            return this.getAgent(
                "aiData"
            );

        }

        /*
         * ==========================================
         * 3. SUPORTE TÉCNICO
         * ==========================================
         */

        if (
            this.matches(
                text,
                [

                    "erro",
                    "falha",
                    "bug",
                    "suporte",
                    "nao funciona",
                    "problema tecnico",
                    "problema técnico"

                ]
            )
        ) {

            return this.getAgent(
                "support"
            );

        }

        /*
         * ==========================================
         * 4. VENDAS
         * ==========================================
         */

        if (
            this.matches(
                text,
                [

                    "comprar",
                    "compra",
                    "produto",
                    "produtos",
                    "pedido",
                    "pedidos",
                    "preco",
                    "preço",
                    "valor",
                    "mouse",
                    "mouses",
                    "teclado",
                    "monitor",
                    "fone",
                    "catalogo",
                    "catálogo",
                    "estoque",
                    "disponivel",
                    "disponíveis",
                    "carrinho",
                    "vender"

                ]
            )
        ) {

            return this.getAgent(
                "sales"
            );

        }

        /*
         * ==========================================
         * 5. SEM NOVA INTENÇÃO
         * ==========================================
         */

        return this.resolveSessionAgent(
            session
        );

    }

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

        return this.getAgent(
            "fallback"
        );

    }

    getAgent(id) {

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

}

module.exports =
    new AgentRouter();
