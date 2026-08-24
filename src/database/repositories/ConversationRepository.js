const prisma = require("../../prisma");

class ConversationRepository {

    async findById(id) {

        return prisma.conversation.findUnique({
            where: { id }
        });

    }

    async findByUser(userId, tenantId) {

        return prisma.conversation.findFirst({

            where: {
                userId,
                tenantId
            },

            orderBy: {
                createdAt: "desc"
            }

        });

    }

    async create({ userId, tenantId }) {

        return prisma.conversation.create({

            data: {
                userId,
                tenantId
            }

        });

    }

    async findOrCreate({ userId, tenantId }) {

        let conversation = await this.findByUser(
            userId,
            tenantId
        );

        if (!conversation) {

            conversation = await this.create({
                userId,
                tenantId
            });

        }

        return conversation;

    }

}

module.exports = new ConversationRepository();
