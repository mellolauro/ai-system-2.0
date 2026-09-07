const prisma = require("../prisma");

class UserService {
    async getById({ tenantId, userId, name = null, role = "CUSTOMER" }) {
        if (!tenantId) {
            throw new Error("tenantId é obrigatório.");
        }

        if (!userId) {
            throw new Error("userId é obrigatório.");
        }

        let user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId
            }
        });

        // Auto-registro caso o usuário não exista no tenant atual
        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: userId,
                    tenantId,
                    name: name || `Cliente ${userId.slice(-4)}`,
                    role
                }
            });

            console.log(`👤 Usuário "${userId}" auto-cadastrado no tenant "${tenantId}".`);
        }

        return user;
    }

    async getByTelegramId({ telegramId }) {
        if (!telegramId) {
            throw new Error("telegramId é obrigatório.");
        }

        return prisma.user.findUnique({
            where: {
                telegramId: String(telegramId)
            },
            include: {
                tenant: true
            }
        });
    }

    async getByPhone({ phone }) {
        if (!phone) {
            throw new Error("phone é obrigatório.");
        }

        return prisma.user.findUnique({
            where: {
                phone: String(phone)
            },
            include: {
                tenant: true
            }
        });
    }
}

module.exports = new UserService();
