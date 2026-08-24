const AgentRegistry = require("../core/AgentRegistry");

class AgentRouter {

    async resolve({
        message,
        session
    }) {

        if (
            !message ||
            typeof message !== "string"
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
         * 1. Intenções explícitas
         */

        if (this.matches(text, [

            "dashboard",
            "grafico",
            "indicador",
            "indicadores",
            "relatorio",
            "analytics",
            "metricas",
            "faturamento"

        ])) {

            return this.getAgent(
                "aiData"
            );

        }

        if (this.matches(text, [

            "erro",
            "falha",
            "bug",
            "suporte",
            "nao funciona",
            "problema tecnico",
            "problema técnico"

        ])) {

            return this.getAgent(
                "support"
            );

        }

        if (this.matches(text, [

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

        ])) {

            return this.getAgent(
                "sales"
            );

        }

        /*
         * 2. Sem nova intenção explícita:
         * mantém o agente atual da sessão.
         */
        return this.resolveSessionAgent(
            session
        );

    }

    resolveSessionAgent(session) {

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
            AgentRegistry.get(id);

        if (!agent) {

            throw new Error(
                `Agent "${id}" não encontrado.`
            );

        }

        return agent;

    }

    matches(text, keywords) {

        return keywords.some(
            keyword =>
                text.includes(keyword)
        );

    }

}

module.exports = new AgentRouter();
