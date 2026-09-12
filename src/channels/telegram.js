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

/*
 * Instância única do bot Telegram.
 *
 * Mantemos a referência fora de initTelegram()
 * para:
 *
 * - impedir dupla inicialização do polling;
 * - permitir desligamento limpo no shutdown;
 * - evitar conflitos 409 durante restart.
 */
let telegramBot =
    null;

function initTelegram() {

    /*
     * ==========================================
     * TOKEN
     * ==========================================
     */
    if (
        !process.env.TELEGRAM_TOKEN
    ) {

        console.error(
            "❌ TELEGRAM_TOKEN não definido no .env"
        );

        return null;

    }

    /*
     * ==========================================
     * EVITA DUPLA INICIALIZAÇÃO
     * ==========================================
     */
    if (
        telegramBot
    ) {

        console.log(
            "ℹ️ Telegram já inicializado."
        );

        return telegramBot;

    }

    /*
     * ==========================================
     * BOT
     * ==========================================
     */
    telegramBot =
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

    /*
     * Referência local para preservar
     * o restante do código existente.
     */
    const bot =
        telegramBot;

    /*
     * ==========================================
     * MESSAGE
     * ==========================================
     */
    bot.on(
        "message",
        async msg => {

            /*
             * Por enquanto tratamos somente
             * mensagens de texto.
             */
            if (
                !msg.text
            ) {

                return;

            }

            /*
             * ==================================
             * IDENTIDADE TELEGRAM
             * ==================================
             */
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

            if (
                !channelSession
            ) {

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
                 *
                 * IMPORTANTE:
                 *
                 * Esta lógica ainda usa o primeiro
                 * tenant ativo como padrão.
                 *
                 * Para o SaaS multi-tenant isso será
                 * ajustado posteriormente para resolver
                 * o tenant a partir do bot/canal.
                 */
                if (
                    !user
                ) {

                    const defaultTenant =
                        await prisma.tenant.findFirst({

                            where: {

                                active:
                                    true

                            }

                        });

                    if (
                        !defaultTenant
                    ) {

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

                /*
                 * Se ocorrer algum erro durante
                 * o processamento da mensagem,
                 * tentamos avisar o usuário.
                 */
                try {

                    await sendTelegramSafe(

                        bot,

                        msg.chat.id,

                        `❌ ${error.message || "Erro interno."}`

                    );

                } catch (
                    sendError
                ) {

                    console.error(
                        "🔥 ERRO AO ENVIAR FALHA TELEGRAM:",
                        sendError.message ||
                        sendError
                    );

                }

            } finally {

                channelSession.processing =
                    false;

            }

        }
    );

    /*
     * ==========================================
     * POLLING ERROR
     * ==========================================
     *
     * Erros do polling precisam ser tratados
     * separadamente para evitar silêncio em
     * problemas do Telegram.
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

    /*
     * ==========================================
     * WEBHOOK ERROR
     * ==========================================
     *
     * Não usamos webhook neste momento,
     * mas o listener ajuda caso a configuração
     * seja alterada futuramente.
     */
    bot.on(
        "webhook_error",
        error => {

            console.error(
                "🔥 TELEGRAM WEBHOOK ERROR:",
                error.message
            );

        }
    );

    console.log(
        "🤖 Telegram ativo (AI-System 2.0 + multi-agent)."
    );

    return telegramBot;

}

/*
 * ============================================================
 * STOP TELEGRAM
 * ============================================================
 *
 * Chamado pelo shutdown do server.js.
 *
 * O objetivo principal é encerrar o long polling antes
 * que o processo termine, evitando conflito temporário
 * com uma nova instância iniciada pelo PM2.
 */
async function stopTelegram() {

    if (
        !telegramBot
    ) {

        return;

    }

    const bot =
        telegramBot;

    /*
     * Removemos primeiro a referência global para impedir
     * qualquer tentativa de reutilização durante o shutdown.
     */
    telegramBot =
        null;

    try {

        if (
            typeof bot.isPolling ===
            "function" &&
            bot.isPolling()
        ) {

            await bot.stopPolling();

        }

    } catch (
        error
    ) {

        console.error(
            "🔥 Erro ao parar polling do Telegram:",
            error.message ||
            error
        );

        throw error;

    } finally {

        telegramSessions.clear();

    }

}

/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */
module.exports = {
    initTelegram,
    stopTelegram
};
