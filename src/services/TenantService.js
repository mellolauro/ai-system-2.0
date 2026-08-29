const prisma =
    require("../prisma");

class TenantService {

    async getById({
        tenantId
    }) {

        if (!tenantId) {

            throw new Error(
                "tenantId é obrigatório."
            );

        }

        const tenant =
            await prisma.tenant.findUnique({

                where: {

                    id:
                        tenantId

                }

            });

        if (!tenant) {

            throw new Error(
                `Tenant "${tenantId}" não encontrado.`
            );

        }

        if (!tenant.active) {

            throw new Error(
                `Tenant "${tenantId}" está inativo.`
            );

        }

        return tenant;

    }

}

module.exports =
    new TenantService();
