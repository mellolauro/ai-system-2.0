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

        const key =
            this.buildKey({

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

            createdAt:
                new Date(),

            updatedAt:
                new Date(),

            metadata: {}

        };

        this.sessions.set(
            key,
            session
        );

        return session;

    }

    load({

        tenantId,

        channel,

        externalUser

    }) {

        const key =
            this.buildKey({

                tenantId,

                channel,

                externalUser

            });

        let session =
            this.sessions.get(key);

        if (!session) {

            session =
                this.create({

                    tenantId,

                    channel,

                    externalUser

                });

        }

        session.updatedAt =
            new Date();

        return session;

    }

    async resolve(request) {

        if (!request.tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        const channel =
            request.channel ||
            "api";

        const externalUser =
            request.externalUserId ||
            request.userId;

        if (!externalUser) {

            throw new Error(
                "externalUserId ou userId é obrigatório."
            );

        }

        return this.load({

            tenantId:
                request.tenantId,

            channel,

            externalUser

        });

    }

    setAgent(
        session,
        agentId
    ) {

        if (!session) {

            throw new Error(
                "Sessão inválida."
            );

        }

        session.agent =
            agentId;

        session.updatedAt =
            new Date();

        return session;

    }

    setConversation(
        session,
        conversationId
    ) {

        if (!session) {

            throw new Error(
                "Sessão inválida."
            );

        }

        session.conversationId =
            conversationId;

        session.updatedAt =
            new Date();

        return session;

    }

    close({

        tenantId,

        channel,

        externalUser

    }) {

        const key =
            this.buildKey({

                tenantId,

                channel,

                externalUser

            });

        this.sessions.delete(
            key
        );

    }

    exists({

        tenantId,

        channel,

        externalUser

    }) {

        const key =
            this.buildKey({

                tenantId,

                channel,

                externalUser

            });

        return this.sessions.has(
            key
        );

    }

    buildKey({

        tenantId,

        channel,

        externalUser

    }) {

        return (
            `${tenantId}:${channel}:${externalUser}`
        );

    }

}

module.exports = new SessionManager();
