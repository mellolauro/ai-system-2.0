const prisma =
    require("../prisma");

class UserService {

    async getById({
        tenantId,
        userId
    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        if (!userId) {

            throw new Error(
                "userId é obrigatório."
            );

        }

        const user =
            await prisma.user.findFirst({

                where: {

                    id:
                        userId,

                    tenantId

                }

            });

        if (!user) {

            throw new Error(
                `Usuário "${userId}" não encontrado no tenant informado.`
            );

        }

        return user;

    }

    async getByTelegramId({
        telegramId
    }) {

        if (!telegramId) {

            throw new Error(
                "telegramId é obrigatório."
            );

        }

        return prisma.user.findUnique({

            where: {

                telegramId:
                    String(
                        telegramId
                    )

            },

            include: {

                tenant:
                    true

            }

        });

    }

    async getByPhone({
        phone
    }) {

        if (!phone) {

            throw new Error(
                "phone é obrigatório."
            );

        }

        return prisma.user.findUnique({

            where: {

                phone:
                    String(phone)

            },

            include: {

                tenant:
                    true

            }

        });

    }

}

module.exports =
    new UserService();
