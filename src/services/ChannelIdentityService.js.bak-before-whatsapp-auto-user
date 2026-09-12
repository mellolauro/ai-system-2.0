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
        tenantId = null
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

            const user =
                await prisma.user.findFirst({

                    where: {

                        phone

                    },

                    include: {

                        tenant:
                            true

                    }

                });

            if (!user) {

                return null;

            }

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
     * +5511999999999
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
