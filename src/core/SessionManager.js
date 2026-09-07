class SessionManager {

    constructor() {
        this.sessions = new Map();
    }

    create({
        tenantId,
        channel,
        externalUser,
        agent = "sales"
    }) {
        const key = this.buildKey({
            tenantId,
            channel,
            externalUser
        });

        const session = {
            id: null,
            key,
            tenantId,
            channel,
            externalUser,
            agent,
            conversationId: null,
            history: [], // Histórico persistente mantido ao trocar de agente
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                transfers: []
            }
        };

        this.sessions.set(key, session);
        return session;
    }

    load({
        tenantId,
        channel,
        externalUser
    }) {
        const key = this.buildKey({
            tenantId,
            channel,
            externalUser
        });

        let session = this.sessions.get(key);

        if (!session) {
            session = this.create({
                tenantId,
                channel,
                externalUser
            });
        }

        session.updatedAt = new Date();
        return session;
    }

    async resolve(request) {
        if (!request.tenantId) {
            throw new Error("tenantId é obrigatório.");
        }

        const channel = request.channel || "api";
        const externalUser = request.externalUserId || request.userId;

        if (!externalUser) {
            throw new Error("externalUserId ou userId é obrigatório.");
        }

        return this.load({
            tenantId: request.tenantId,
            channel,
            externalUser
        });
    }

    /**
     * Alterna o agente ativo na sessão e registra a transferência de atendimento
     * mantendo integralmente o histórico de mensagens acumulado.
     */
    setAgent(session, agentId, reason = "transfer") {
        if (!session) {
            throw new Error("Sessão inválida.");
        }

        if (session.agent !== agentId) {
            const previousAgent = session.agent;
            session.agent = agentId;

            // Registra evento de transferência para auditoria
            if (!session.metadata.transfers) {
                session.metadata.transfers = [];
            }

            session.metadata.transfers.push({
                from: previousAgent,
                to: agentId,
                reason,
                timestamp: new Date()
            });

            // Opcional: injeta marcador de sistema no histórico para contextualizar o LLM
            session.history.push({
                role: "system",
                content: `[SISTEMA]: Atendimento transferido do agente '${previousAgent}' para o agente '${agentId}'.`,
                timestamp: new Date()
            });
        }

        session.updatedAt = new Date();
        return session;
    }

    setConversation(session, conversationId) {
        if (!session) {
            throw new Error("Sessão inválida.");
        }

        session.conversationId = conversationId;
        session.updatedAt = new Date();
        return session;
    }

    /**
     * Adiciona uma nova interação (user/assistant/system) ao histórico unificado da sessão.
     */
    addMessage(session, { role, content }) {
        if (!session) {
            throw new Error("Sessão inválida.");
        }

        if (!Array.isArray(session.history)) {
            session.history = [];
        }

        session.history.push({
            role,
            content,
            agent: session.agent,
            timestamp: new Date()
        });

        session.updatedAt = new Date();
        return session;
    }

    /**
     * Retorna o histórico de conversas em formato compatível com o ContextBuilder.
     */
    getHistory(session) {
        if (!session || !Array.isArray(session.history)) {
            return [];
        }

        return session.history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    close({
        tenantId,
        channel,
        externalUser
    }) {
        const key = this.buildKey({
            tenantId,
            channel,
            externalUser
        });

        this.sessions.delete(key);
    }

    exists({
        tenantId,
        channel,
        externalUser
    }) {
        const key = this.buildKey({
            tenantId,
            channel,
            externalUser
        });

        return this.sessions.has(key);
    }

    buildKey({
        tenantId,
        channel,
        externalUser
    }) {
        return `${tenantId}:${channel}:${externalUser}`;
    }

}

module.exports = new SessionManager();
