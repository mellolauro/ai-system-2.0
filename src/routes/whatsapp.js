const express =
    require("express");

const path =
    require("path");

const fs =
    require("fs");

const ChannelIdentityService =
    require("../services/ChannelIdentityService");

const Orchestrator =
    require("../core/Orchestrator");

const router =
    express.Router();

/*
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

const INTERNAL_TOKEN =
    process.env.AI_SYSTEM_INTERNAL_TOKEN;

/*
 * Diretório público do AI-System.
 */
const PUBLIC_DIR =
    path.resolve(
        process.env.AI_SYSTEM_PUBLIC_DIR ||
        path.resolve(
            __dirname,
            "../../public"
        )
    );

/*
 * Diretório permitido para mídia.
 */
const MEDIA_DIR =
    path.resolve(
        PUBLIC_DIR,
        "uploads"
    );

/*
 * ============================================================
 * AUTENTICAÇÃO INTERNA
 * ============================================================
 */

function validateInternalToken(
    req,
    res
) {

    if (!INTERNAL_TOKEN) {

        console.error(
            "[WhatsApp] AI_SYSTEM_INTERNAL_TOKEN não configurado."
        );

        res.status(500).json({

            success: false,

            error:
                "Token interno do AI-System não configurado."

        });

        return false;

    }

    const authorization =
        req.get(
            "Authorization"
        ) || "";

    const expected =
        `Bearer ${INTERNAL_TOKEN}`;

    if (
        authorization !==
        expected
    ) {

        console.warn(
            "[WhatsApp] Tentativa de acesso interno não autorizado."
        );

        res.status(401).json({

            success: false,

            error:
                "Não autorizado."

        });

        return false;

    }

    return true;

}

/*
 * ============================================================
 * NORMALIZAÇÃO DE MÍDIA
 * ============================================================
 */

function normalizeMedia(
    media
) {

    if (
        !Array.isArray(media)
    ) {

        return [];

    }

    const normalized = [];

    for (
        const item
        of media
    ) {

        if (
            !item ||
            typeof item !==
                "object"
        ) {

            continue;

        }

        const rawPath =
            item.path;

        const rawUrl =
            item.url;

        /*
         * Caso o provider tenha retornado
         * somente a URL relativa do catálogo.
         */
        if (
            rawUrl &&
            typeof rawUrl ===
                "string" &&
            rawUrl.startsWith(
                "/uploads/"
            )
        ) {

            const relativePath =
                rawUrl.replace(
                    /^\/+/,
                    ""
                );

            const absolutePath =
                path.resolve(
                    PUBLIC_DIR,
                    relativePath
                );

            if (
                isAllowedMediaPath(
                    absolutePath
                ) &&
                fs.existsSync(
                    absolutePath
                )
            ) {

                normalized.push({

                    type:
                        "image",

                    path:
                        absolutePath,

                    url:
                        rawUrl

                });

            }

            continue;

        }

        /*
         * Caso o provider já tenha
         * entregue um caminho absoluto.
         */
        if (
            rawPath &&
            typeof rawPath ===
                "string"
        ) {

            const absolutePath =
                path.resolve(
                    rawPath
                );

            if (
                isAllowedMediaPath(
                    absolutePath
                ) &&
                fs.existsSync(
                    absolutePath
                )
            ) {

                normalized.push({

                    type:
                        item.type ||
                        "image",

                    path:
                        absolutePath,

                    url:
                        rawUrl ||
                        null

                });

            }

        }

    }

    /*
     * Remove duplicatas.
     */
    const unique =
        new Map();

    for (
        const item
        of normalized
    ) {

        unique.set(
            item.path,
            item
        );

    }

    return [
        ...unique.values()
    ];

}

function isAllowedMediaPath(
    filePath
) {

    const normalized =
        path.resolve(
            filePath
        );

    const base =
        path.resolve(
            MEDIA_DIR
        );

    return (

        normalized === base ||

        normalized.startsWith(
            `${base}${path.sep}`
        )

    );

}

/*
 * ============================================================
 * POST /internal/whatsapp/inbound
 * ============================================================
 */

router.post(

    "/inbound",

    async (
        req,
        res
    ) => {

        try {

            /*
             * Segurança.
             */
            if (
                !validateInternalToken(
                    req,
                    res
                )
            ) {

                return;

            }

            /*
             * Dados recebidos do OpenClaw.
             */
            const {

                externalUserId,

                message,

                accountId,

                senderId,

                sessionKey,

                conversationId,

                messageId

            } =
                req.body || {};

            /*
             * Validação.
             */
            if (
                !externalUserId ||
                typeof externalUserId !==
                    "string"
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "externalUserId é obrigatório."

                    });

            }

            if (
                !message ||
                typeof message !==
                    "string"
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "message é obrigatório."

                    });

            }

            /*
             * ==================================================
             * LOG DE ENTRADA
             * ==================================================
             */

            console.log(
                "\n[WhatsApp] ===== INBOUND ====="
            );

            console.log(
                JSON.stringify(
                    {

                        externalUserId,

                        message,

                        accountId:
                            accountId ||
                            "default",

                        senderId:
                            senderId ||
                            null,

                        sessionKey:
                            sessionKey ||
                            null,

                        conversationId:
                            conversationId ||
                            null,

                        messageId:
                            messageId ||
                            null

                    },
                    null,
                    2
                )
            );

            /*
             * ==================================================
             * IDENTIDADE
             * ==================================================
             */

            const identity =
                await ChannelIdentityService.resolve({

                    channel:
                        "whatsapp",

                    externalUserId

                });

            if (
                !identity ||
                !identity.user
            ) {

                throw new Error(
                    "Usuário do WhatsApp não foi encontrado."
                );

            }

            const user =
                identity.user;

            const tenant =
                identity.tenant ||
                user.tenant;

            if (!tenant) {

                throw new Error(
                    "Tenant do usuário não foi encontrado."
                );

            }

            /*
             * ==================================================
             * LOG DA IDENTIDADE
             * ==================================================
             */

            console.log(
                "[WhatsApp] Usuário identificado:",
                user.id,
                user.name
            );

            console.log(
                "[WhatsApp] Tenant identificado:",
                tenant.id,
                tenant.name
            );

            /*
             * ==================================================
             * EXECUTA O AI-SYSTEM
             * ==================================================
             */

            const result =
                await Orchestrator.execute({

                    tenantId:
                        tenant.id,

                    userId:
                        user.id,

                    channel:
                        "whatsapp",

                    externalUserId,

                    message,

                    agentContext:
                        "client"

                });

            /*
             * ==================================================
             * RESPOSTA
             * ==================================================
             */

            const responseText =
                typeof result?.response ===
                    "string"

                    ? result.response

                    : "";

            /*
             * Normaliza mídia.
             */
            const media =
                normalizeMedia(
                    result?.media
                );

            /*
             * ==================================================
             * LOG
             * ==================================================
             */

            console.log(
                "[WhatsApp] Agente:",
                result?.agent?.getId
                    ? result.agent.getId()
                    : result?.agent?.id ||
                      null
            );

            console.log(
                "[WhatsApp] Resposta gerada:",
                responseText
            );

            console.log(
                "[WhatsApp] Mídias:",
                JSON.stringify(
                    media,
                    null,
                    2
                )
            );

            console.log(
                "[WhatsApp] =========================\n"
            );

            /*
             * ==================================================
             * RETORNO
             * ==================================================
             */

            return res.json({

                success: true,

                response:
                    responseText,

                media,

                agent:
                    result?.agent?.getId
                        ? result.agent.getId()
                        : result?.agent?.id ||
                          null,

                tenant: {

                    id:
                        tenant.id,

                    name:
                        tenant.name

                },

                user: {

                    id:
                        user.id,

                    name:
                        user.name

                }

            });

        } catch (error) {

            console.error(
                "[WhatsApp] ERRO:",
                error.stack ||
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message ||
                        "Erro interno no AI-System."

                });

        }

    }

);

module.exports =
    router;
