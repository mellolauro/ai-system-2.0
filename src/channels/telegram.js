const TelegramBot =
    require("node-telegram-bot-api");

const prisma =
    require("../prisma");

const Orchestrator =
    require("../core/Orchestrator");

const {
    sendTelegramSafe,
    sendTelegramMedia
} = require("./utils/sendSafe");

/*
 * Estado mínimo específico do canal Telegram.
 *
 * A memória da conversa permanece no AI-System:
 *
 * Session
 *   ↓
 * Conversation
 *   ↓
 * Message
 *
 * Este Map mantém somente:
 *
 * - processing
 * - agentContext
 */
const telegramSessions =
    new Map();

function initTelegram() {

    if (!process.env.TELEGRAM_TOKEN) {

        console.error(
            "❌ TELEGRAM_TOKEN não definido no .env"
        );

        return;

    }

    const bot =
        new TelegramBot(
            process.env.TELEGRAM_TOKEN,
            {

                polling: {

                    interval:
                        1000,

                    autoStart:
                        true,

                    params: {

                        timeout:
                            10

                    }

                }

            }
        );

    bot.on(
        "message",
        async msg => {

            if (!msg.text) {

                return;

            }

            const telegramId =
                String(
                    msg.from.id
                );

            const text =
                msg.text.trim();

            /*
             * ============================
             * SESSION DO CANAL
             * ============================
             */
            let channelSession =
                telegramSessions.get(
                    telegramId
                );

            if (!channelSession) {

                channelSession = {

                    processing:
                        false,

                    agentContext:
                        "client"

                };

                telegramSessions.set(
                    telegramId,
                    channelSession
                );

            }

            /*
             * ============================
             * ANTI-FLOOD
             * ============================
             */
            if (
                channelSession.processing
            ) {

                await sendTelegramSafe(

                    bot,

                    msg.chat.id,

                    "⏳ Aguarde a conclusão da solicitação anterior."

                );

                return;

            }

            channelSession.processing =
                true;

            try {

                /*
                 * ============================
                 * RESOLVE USER
                 * ============================
                 */
                let user =
                    await prisma.user.findUnique({

                        where: {

                            telegramId

                        },

                        include: {

                            tenant:
                                true

                        }

                    });

                /*
                 * ============================
                 * CRIA USER SE NECESSÁRIO
                 * ============================
                 */
                if (!user) {

                    const defaultTenant =
                        await prisma.tenant.findFirst({

                            where: {

                                active:
                                    true

                            }

                        });

                    if (!defaultTenant) {

                        await sendTelegramSafe(

                            bot,

                            msg.chat.id,

                            "❌ Nenhum tenant ativo está configurado."

                        );

                        return;

                    }

                    user =
                        await prisma.user.create({

                            data: {

                                telegramId,

                                name:
                                    msg.from.first_name ||
                                    "User",

                                tenantId:
                                    defaultTenant.id,

                                role:
                                    "USER"

                            },

                            include: {

                                tenant:
                                    true

                            }

                        });

                }

                /*
                 * ============================
                 * COMANDOS DE CONTEXTO
                 * ============================
                 */

                if (
                    text.toLowerCase() ===
                    "/client"
                ) {

                    channelSession.agentContext =
                        "client";

                    await sendTelegramSafe(

                        bot,

                        msg.chat.id,

                        "✅ Contexto de atendimento definido como cliente."

                    );

                    return;

                }

                /*
                 * /admin NÃO concede privilégio.
                 *
                 * Primeiro verificamos a identidade
                 * real do usuário no banco.
                 */
                if (
                    text.toLowerCase() ===
                    "/admin"
                ) {

                    if (
                        user.role !==
                        "ADMIN"
                    ) {

                        channelSession.agentContext =
                            "client";

                        await sendTelegramSafe(

                            bot,

                            msg.chat.id,

                            "❌ Usuário não possui permissão administrativa."

                        );

                        return;

                    }

                    channelSession.agentContext =
                        "admin";

                    await sendTelegramSafe(

                        bot,

                        msg.chat.id,

                        "🔐 Contexto administrativo ativado."

                    );

                    return;

                }

                /*
                 * ============================
                 * TELEGRAM → AI-SYSTEM
                 * ============================
                 */

                await bot.sendChatAction(

                    msg.chat.id,

                    "typing"

                );

                const result =
                    await Orchestrator.execute({

                        tenantId:
                            user.tenantId,

                        userId:
                            user.id,

                        channel:
                            "telegram",

                        externalUserId:
                            telegramId,

                        agentContext:
                            channelSession.agentContext,

                        message:
                            text

                    });

                /*
                 * ============================
                 * RESPOSTA TEXTO
                 * ============================
                 */
                await sendTelegramSafe(

                    bot,

                    msg.chat.id,

                    result?.response ||
                    result?.text ||
                    "Sem resposta."

                );

                /*
                 * ============================
                 * RESPOSTA MÍDIA
                 * ============================
                 *
                 * As imagens vêm separadas
                 * do texto.
                 */
                await sendTelegramMedia(

                    bot,

                    msg.chat.id,

                    result?.media ||
                    []

                );

            } catch (error) {

                console.error(
                    "🔥 ERRO TELEGRAM:",
                    error.stack ||
                    error
                );

                await sendTelegramSafe(

                    bot,

                    msg.chat.id,

                    `❌ ${error.message || "Erro interno."}`

                );

            } finally {

                channelSession.processing =
                    false;

            }

        }
    );

    /*
     * Erros do polling precisam ser
     * tratados separadamente para evitar
     * silêncio em problemas do Telegram.
     */
    bot.on(
        "polling_error",
        error => {

            console.error(
                "🔥 TELEGRAM POLLING ERROR:",
                error.message
            );

        }
    );

    console.log(
        "🤖 Telegram ativo (AI-System 2.0 + multi-agent)."
    );

}

module.exports = {
    initTelegram
};
