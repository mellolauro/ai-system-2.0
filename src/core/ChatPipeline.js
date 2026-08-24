const SessionManager = require("./SessionManager");
const MemoryManager = require("./MemoryManager");
const ContextBuilder = require("./ContextBuilder");
const PromptManager = require("./PromptManager");
const ToolManager = require("./ToolManager");

const AgentRouter = require("../routing/AgentRouter");

const ProviderManager =
    require("../providers/ProviderManager");

const aiConfig =
    require("../config/ai");

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
        // 2) Carrega memória / Conversation
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
        // 3) Resolve agente
        //----------------------------------------------------

        const agent =
            await AgentRouter.resolve({

                session,

                message:
                    request.message,

                tenantId:
                    request.tenantId

            });

        //----------------------------------------------------
        // 4) Atualiza agente da sessão
        //----------------------------------------------------

        SessionManager.setAgent(
            session,
            agent.getId()
        );

        //----------------------------------------------------
        // 5) Prompt
        //----------------------------------------------------

        const prompt =
            await PromptManager.load(
                agent
            );

        //----------------------------------------------------
        // 6) Contexto
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
        // 7) Tools
        //----------------------------------------------------

        const tools =
            ToolManager.getDefinitions(
                agent
            );

        //----------------------------------------------------
        // 8) Resolve provider efetivo
        //----------------------------------------------------

        const providerName =
            agent.getProvider() ||
            aiConfig.provider;

        const provider =
            ProviderManager.resolve(
                providerName
            );

        //----------------------------------------------------
        // 9) Resolve target do agente no provider
        //----------------------------------------------------

        const agentTarget =
            typeof provider.resolveAgentTarget ===
                "function"

                ? provider.resolveAgentTarget(
                    agent.getId()
                )

                : null;

        //----------------------------------------------------
        // 10) Executa provider
        //----------------------------------------------------

        const response =
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

                tenantId:
                    request.tenantId,

                userId:
                    request.userId,

                channel:
                    request.channel,

                permissions:
                    agent.getPermissions()

            });

        //----------------------------------------------------
        // 11) Persiste mensagem do usuário
        //----------------------------------------------------

        await MemoryManager.saveUserMessage({

            conversationId:
                memory.conversation.id,

            content:
                request.message

        });

        //----------------------------------------------------
        // 12) Persiste resposta do assistant
        //----------------------------------------------------

        await MemoryManager.saveAssistantMessage({

            conversationId:
                memory.conversation.id,

            content:
                response

        });

        //----------------------------------------------------
        // 13) Retorno
        //----------------------------------------------------

        return {

            session,

            conversation:
                memory.conversation,

            agent,

            provider:
                providerName,

            agentTarget,

            response

        };

    }

}

module.exports = new ChatPipeline();
