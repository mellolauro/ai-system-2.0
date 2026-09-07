const SessionManager = require("./SessionManager");
const MemoryManager = require("./MemoryManager");
const ContextBuilder = require("./ContextBuilder");
const PromptManager = require("./PromptManager");
const ToolManager = require("./ToolManager");
const AgentRouter = require("../routing/AgentRouter");
const ProviderManager = require("../providers/ProviderManager");
const aiConfig = require("../config/ai");
const UserService = require("../services/UserService");
const TenantService = require("../services/TenantService");

class ChatPipeline {
    async execute(request) {
        //----------------------------------------------------
        // 1) Resolve sessão
        //----------------------------------------------------
        const session = await SessionManager.resolve(request);

        //----------------------------------------------------
        // 2) Resolve usuário
        //----------------------------------------------------
        const user = await UserService.getById({
            tenantId: request.tenantId,
            userId: request.userId
        });

        //----------------------------------------------------
        // 3) Resolve tenant
        //----------------------------------------------------
        const tenant = await TenantService.getById({
            tenantId: request.tenantId
        });

        //----------------------------------------------------
        // 4) Carrega memória / Conversation
        //----------------------------------------------------
        const memory = await MemoryManager.load({
            session,
            userId: request.userId,
            tenantId: request.tenantId
        });

        console.log("[ChatPipeline][DEBUG] Session:", session.key);
        console.log("[ChatPipeline][DEBUG] Session conversationId:", session.conversationId);
        console.log("[ChatPipeline][DEBUG] Memory conversationId:", memory.conversation.id);
        console.log("[ChatPipeline][DEBUG] Tenant:", tenant.name);

        //----------------------------------------------------
        // 5) Resolve agente
        //----------------------------------------------------
        const agent = await AgentRouter.resolve({
            session,
            message: request.message,
            user,
            agentContext: request.agentContext || "client"
        });

        //----------------------------------------------------
        // 6) Atualiza agente da sessão
        //----------------------------------------------------
        SessionManager.setAgent(session, agent.getId());

        //----------------------------------------------------
        // 7) Prompt
        //----------------------------------------------------
        const prompt = await PromptManager.load(agent);

        //----------------------------------------------------
        // 8) Contexto
        //----------------------------------------------------
        const context = ContextBuilder.build({
            agent,
            prompt,
            session,
            history: memory.history,
            userMessage: request.message,
            tenant,
            user
        });

        //----------------------------------------------------
        // 9) Tools
        //----------------------------------------------------
        const tools = ToolManager.getDefinitions(agent);

        //----------------------------------------------------
        // 10) Resolve provider
        //----------------------------------------------------
        const providerName = agent.getProvider() || aiConfig.provider;
        const provider = ProviderManager.resolve(providerName);

        //----------------------------------------------------
        // 11) Resolve target
        //----------------------------------------------------
        const agentTarget =
            typeof provider.resolveAgentTarget === "function"
                ? provider.resolveAgentTarget(agent.getId())
                : null;

        //----------------------------------------------------
        // 12) Executa provider
        //----------------------------------------------------
        const providerResult = await ProviderManager.execute({
            provider: providerName,
            agent: agent.getId(),
            agentTarget,
            model: agent.getModel(),
            temperature: agent.getTemperature(),
            maxTokens: agent.getMaxTokens(),
            messages: context.messages,
            tools,
            context,
            session,
            tenantId: request.tenantId,
            userId: request.userId,
            userRole: user.role,
            tenantName: tenant.name,
            channel: request.channel,
            permissions: agent.getPermissions()
        });

        //----------------------------------------------------
        // 13) Normaliza resposta do provider
        //----------------------------------------------------
        const responseText =
            typeof providerResult === "string"
                ? providerResult
                : (
                    providerResult?.text ||
                    providerResult?.response ||
                    ""
                );

        const media =
            typeof providerResult === "object" && Array.isArray(providerResult?.media)
                ? providerResult.media
                : [];

        //----------------------------------------------------
        // 14) Persiste mensagem do usuário
        //----------------------------------------------------
        await MemoryManager.saveUserMessage({
            conversationId: memory.conversation.id,
            content: request.message
        });

        //----------------------------------------------------
        // 15) Persiste resposta
        //----------------------------------------------------
        await MemoryManager.saveAssistantMessage({
            conversationId: memory.conversation.id,
            content: responseText
        });

        //----------------------------------------------------
        // 16) Retorno
        //----------------------------------------------------
        return {
            session,
            conversation: memory.conversation,
            agent,
            provider: providerName,
            agentTarget,
            response: responseText,
            media,
            tenant: {
                id: tenant.id,
                name: tenant.name
            }
        };
    }
}

module.exports = new ChatPipeline();
