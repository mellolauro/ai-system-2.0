const SessionManager =
    require("./SessionManager");

const MemoryManager =
    require("./MemoryManager");

const ContextBuilder =
    require("./ContextBuilder");

const PromptManager =
    require("./PromptManager");

const ToolManager =
    require("./ToolManager");

const AgentRouter =
    require("../routing/AgentRouter");

const ProviderManager =
    require("../providers/ProviderManager");

const aiConfig =
    require("../config/ai");

const UserService =
    require("../services/UserService");

class ChatPipeline {

    async execute(request) {

        //----------------------------------------------------
        // 1) Resolve sessão
        //----------------------------------------------------

        const session =
            await SessionManager.resolve(
                request
            );

        //----------------------------------------------------
        // 2) Resolve usuário
        //----------------------------------------------------

        const user =
            await UserService.getById({

                tenantId:
                    request.tenantId,

                userId:
                    request.userId

            });

        //----------------------------------------------------
        // 3) Carrega memória / Conversation
        //----------------------------------------------------

        const memory =
            await MemoryManager.load({

                session,

                userId:
                    request.userId,

                tenantId:
                    request.tenantId

            });

        console.log(
            "[ChatPipeline][DEBUG] Session:",
            session.key
        );

        console.log(
            "[ChatPipeline][DEBUG] Session conversationId:",
            session.conversationId
        );

        console.log(
            "[ChatPipeline][DEBUG] Memory conversationId:",
            memory.conversation.id
        );

        //----------------------------------------------------
        // 4) Resolve agente
        //----------------------------------------------------

        const agent =
            await AgentRouter.resolve({

                session,

                message:
                    request.message,

                user,

                agentContext:
                    request.agentContext ||
                    "client"

            });

        //----------------------------------------------------
        // 5) Atualiza agente da sessão
        //----------------------------------------------------

        SessionManager.setAgent(
            session,
            agent.getId()
        );

        //----------------------------------------------------
        // 6) Prompt
        //----------------------------------------------------

        const prompt =
            await PromptManager.load(
                agent
            );

        //----------------------------------------------------
        // 7) Contexto
        //----------------------------------------------------

        const context =
            ContextBuilder.build({

                agent,

                prompt,

                session,

                history:
                    memory.history,

                userMessage:
                    request.message

            });

        //----------------------------------------------------
        // 8) Tools
        //----------------------------------------------------

        const tools =
            ToolManager.getDefinitions(
                agent
            );

        //----------------------------------------------------
        // 9) Resolve provider efetivo
        //----------------------------------------------------

        const providerName =
            agent.getProvider() ||
            aiConfig.provider;

        const provider =
            ProviderManager.resolve(
                providerName
            );

        //----------------------------------------------------
        // 10) Resolve target
        //----------------------------------------------------

        const agentTarget =
            typeof provider.resolveAgentTarget ===
                "function"

                ? provider.resolveAgentTarget(
                    agent.getId()
                )

                : null;

        //----------------------------------------------------
        // 11) Executa provider
        //----------------------------------------------------

        const providerResult =
            await ProviderManager.execute({

                provider:
                    providerName,

                agent:
                    agent.getId(),

                agentTarget,

                model:
                    agent.getModel(),

                temperature:
                    agent.getTemperature(),

                maxTokens:
                    agent.getMaxTokens(),

                messages:
                    context.messages,

                tools,

                context,

                session,

                tenantId:
                    request.tenantId,

                userId:
                    request.userId,

                channel:
                    request.channel,

                permissions:
                    agent.getPermissions()

            });

        /*
         * Compatibilidade:
         *
         * Provider antigo:
         *     "texto"
         *
         * Provider novo:
         *     {
         *         text: "...",
         *         media: [...]
         *     }
         */
        const responseText =
            typeof providerResult ===
            "string"

                ? providerResult

                : (
                    providerResult?.text ||
                    providerResult?.response ||
                    ""
                );

        const media =
            typeof providerResult ===
                "object" &&

            Array.isArray(
                providerResult?.media
            )

                ? providerResult.media

                : [];

        //----------------------------------------------------
        // 12) Persiste mensagem do usuário
        //----------------------------------------------------

        await MemoryManager.saveUserMessage({

            conversationId:
                memory.conversation.id,

            content:
                request.message

        });

        //----------------------------------------------------
        // 13) Persiste resposta do assistant
        //----------------------------------------------------

        await MemoryManager.saveAssistantMessage({

            conversationId:
                memory.conversation.id,

            content:
                responseText

        });

        //----------------------------------------------------
        // 14) Retorno
        //----------------------------------------------------

        return {

            session,

            conversation:
                memory.conversation,

            agent,

            provider:
                providerName,

            agentTarget,

            response:
                responseText,

            media

        };

    }

}

module.exports =
    new ChatPipeline();
