const prisma = require("../prisma");

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

}

module.exports = new UserService();
