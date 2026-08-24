const prisma = require("../../prisma");

class MessageRepository {

    async save({

        conversationId,

        role,

        content

    }) {

        return prisma.message.create({

            data: {

                conversationId,

                role,

                content

            }

        });

    }

    async history(conversationId, limit = 20) {

        const messages = await prisma.message.findMany({

            where: {
                conversationId
            },

            orderBy: {
                createdAt: "asc"
            },

            take: limit

        });

        return messages.map(msg => ({

            role: msg.role,

            content: msg.content

        }));

    }

    async clear(conversationId) {

        return prisma.message.deleteMany({

            where: {
                conversationId
            }

        });

    }

}

module.exports = new MessageRepository();
