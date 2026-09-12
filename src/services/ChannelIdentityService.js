const prisma =
    require("../prisma");

class ChannelIdentityService {

    /*
     * Resolve um usuário a partir da identidade
     * externa de um canal.
     *
     * Exemplos:
     *
     * telegram
     *   externalUserId = telegramId
     *
     * whatsapp
     *   externalUserId = telefone
     */
    async resolve({
        channel,
        externalUserId,
        tenantId = null,
        senderName = null
    }) {

        if (!channel) {

            throw new Error(
                "channel é obrigatório."
            );

        }

        if (!externalUserId) {

            throw new Error(
                "externalUserId é obrigatório."
            );

        }

        const normalizedChannel =
            String(channel)
                .trim()
                .toLowerCase();

        const normalizedExternalUserId =
            String(externalUserId)
                .trim();

        const normalizedSenderName =
            typeof senderName ===
                "string"
                ? senderName.trim()
                : "";

        if (!normalizedExternalUserId) {

            throw new Error(
                "externalUserId é obrigatório."
            );

        }

        /*
         * ==========================================
         * TELEGRAM
         * ==========================================
         */
        if (
            normalizedChannel ===
            "telegram"
        ) {

            const user =
                await prisma.user.findFirst({

                    where: {

                        telegramId:
                            normalizedExternalUserId

                    },

                    include: {

                        tenant:
                            true

                    }

                });

            if (!user) {

                return null;

            }

            /*
             * Se o chamador informou um tenant,
             * validamos o vínculo.
             */
            if (
                tenantId &&
                user.tenantId !==
                    tenantId
            ) {

                throw new Error(
                    "Usuário do Telegram não pertence ao tenant informado."
                );

            }

            return {

                user,

                tenant:
                    user.tenant

            };

        }

        /*
         * ==========================================
         * WHATSAPP
         * ==========================================
         *
         * O WhatsApp utilizará o campo phone.
         */
        if (
            normalizedChannel ===
            "whatsapp"
        ) {

            const phone =
                this.normalizePhone(
                    normalizedExternalUserId
                );

            if (!phone) {

                throw new Error(
                    "Telefone do WhatsApp inválido."
                );

            }

            let user =
                await prisma.user.findUnique({

                    where: {

                        phone

                    },

                    include: {

                        tenant:
                            true

                    }

                });

            /*
             * ==========================================
             * USUÁRIO JÁ CADASTRADO
             * ==========================================
             *
             * Não alteramos automaticamente o nome
             * do usuário existente com base no nome
             * recebido do WhatsApp.
             */
            if (user) {

                if (
                    tenantId &&
                    user.tenantId !==
                        tenantId
                ) {

                    throw new Error(
                        "Usuário do WhatsApp não pertence ao tenant informado."
                    );

                }

                return {

                    user,

                    tenant:
                        user.tenant

                };

            }

            /*
             * ==========================================
             * NOVO CLIENTE WHATSAPP
             * ==========================================
             *
             * Cada instalação do AI-System possui
             * exatamente um tenant ativo.
             *
             * Se tenantId foi informado pelo chamador,
             * usamos e validamos esse tenant.
             *
             * Caso contrário, exigimos exatamente
             * um tenant ativo na instalação.
             */
            let tenant;

            if (tenantId) {

                tenant =
                    await prisma.tenant.findFirst({

                        where: {

                            id:
                                tenantId,

                            active:
                                true

                        }

                    });

                if (!tenant) {

                    throw new Error(
                        "Tenant informado não foi encontrado ou está inativo."
                    );

                }

            } else {

                const activeTenants =
                    await prisma.tenant.findMany({

                        where: {

                            active:
                                true

                        },

                        take:
                            2

                    });

                if (
                    activeTenants.length ===
                    0
                ) {

                    throw new Error(
                        "Nenhum tenant ativo foi encontrado para o WhatsApp."
                    );

                }

                if (
                    activeTenants.length >
                    1
                ) {

                    throw new Error(
                        "Mais de um tenant ativo foi encontrado. A instalação deve possuir apenas um tenant ativo."
                    );

                }

                tenant =
                    activeTenants[0];

            }

            /*
             * ==========================================
             * NOME DO NOVO CLIENTE
             * ==========================================
             *
             * Quando o OpenClaw fornecer senderName,
             * usamos o nome real do perfil WhatsApp.
             *
             * Caso contrário, utilizamos o fallback.
             */
            const userName =
                normalizedSenderName ||
                "Cliente WhatsApp";

            /*
             * ==========================================
             * CRIA AUTOMATICAMENTE O CLIENTE
             * ==========================================
             */
            try {

                user =
                    await prisma.user.create({

                        data: {

                            phone,

                            name:
                                userName,

                            tenantId:
                                tenant.id

                        },

                        include: {

                            tenant:
                                true

                        }

                    });

                console.log(
                    "[ChannelIdentityService] Novo usuário WhatsApp criado:",
                    user.id,
                    phone,
                    user.name
                );

            } catch (error) {

                /*
                 * Proteção contra duas mensagens simultâneas
                 * do mesmo número tentando cadastrar o usuário.
                 *
                 * P2002 = unique constraint do Prisma.
                 */
                if (
                    error &&
                    error.code ===
                        "P2002"
                ) {

                    user =
                        await prisma.user.findUnique({

                            where: {

                                phone

                            },

                            include: {

                                tenant:
                                    true

                            }

                        });

                    if (!user) {

                        throw error;

                    }

                } else {

                    throw error;

                }

            }

            return {

                user,

                tenant:
                    user.tenant ||
                    tenant

            };

        }

        /*
         * ==========================================
         * CANAL NÃO SUPORTADO
         * ==========================================
         */
        throw new Error(
            `Canal de identidade não suportado: ${channel}`
        );

    }

    /*
     * Normaliza telefone para um formato
     * consistente antes da consulta.
     *
     * Exemplo:
     *
     * +55 (11) 99999-9999
     * ↓
     * 5511999999999
     */
    normalizePhone(
        phone
    ) {

        if (!phone) {

            return null;

        }

        let value =
            String(phone)
                .trim();

        if (!value) {

            return null;

        }

        /*
         * Mantém apenas números.
         */
        value =
            value.replace(
                /\D/g,
                ""
            );

        if (!value) {

            return null;

        }

        /*
         * O banco deverá armazenar
         * preferencialmente no formato:
         *
         * 5511999999999
         *
         * Mas aceitamos + no valor recebido
         * através da limpeza acima.
         */
        return value;

    }

}

module.exports =
    new ChannelIdentityService();
