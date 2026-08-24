const axios = require("axios");

const Provider = require("./Provider");
const ToolManager = require("../core/ToolManager");

class OpenClawProvider extends Provider {

    constructor(config = {}) {

        super({
            name: config.name || "openclaw"
        });

        this.baseUrl = (
            config.baseUrl ||
            process.env.OPENCLAW_URL ||
            "http://127.0.0.1:18789"
        ).replace(/\/$/, "");

        this.token =
            config.token ||
            process.env.OPENCLAW_TOKEN;

        this.agentTarget =
            config.agentTarget ||
            "openclaw/default";

        this.timeout =
            Number(
                config.timeout ||
                process.env.DEFAULT_TIMEOUT ||
                60000
            );

        /*
         * Limite de segurança para evitar
         * loop infinito de Tool Calling.
         */
        this.maxToolCalls =
            Number(
                config.maxToolCalls ||
                process.env.MAX_TOOL_CALLS ||
                8
            );

        this.http = axios.create({

            baseURL:
                `${this.baseUrl}/v1`,

            timeout:
                this.timeout,

            headers: {

                Authorization:
                    `Bearer ${this.token}`,

                "Content-Type":
                    "application/json",

                Accept:
                    "application/json"

            }

        });

    }

    async initialize() {

        if (!this.token) {

            throw new Error(
                "OPENCLAW_TOKEN não configurado."
            );

        }

        try {

            const health =
                await this.health();

            console.log(
                `[OpenClawProvider] ✅ Gateway HTTP disponível (${health.status})`
            );

            return true;

        } catch (error) {

            console.error(
                "[OpenClawProvider] ❌ Falha ao conectar ao Gateway:",
                error.message
            );

            throw error;

        }

    }

    async generate(request = {}) {

        const {

            messages = [],

            session = "main",

            agent,

            temperature,

            maxTokens,

            tools = [],

            tenantId,

            userId,

            channel,

            permissions = [],

            stream = false

        } = request;

        /*
         * Resolve o agente do AI-System para
         * o target correspondente no OpenClaw.
         */
        const model =
            request.agentTarget ||
            this.resolveAgentTarget(agent);

        /*
         * Não altera o array original.
         */
        const conversationMessages =
            Array.isArray(messages)
                ? [...messages]
                : [];

        /*
         * As tools já devem chegar aqui no formato
         * OpenAI-compatible produzido pelo ToolManager.
         */
        const toolDefinitions =
            this.normalizeTools(tools);

        /*
         * Contexto confiável da aplicação.
         *
         * Esses valores não são escolhidos pelo LLM.
         */
        const toolContext = {

            tenantId,

            userId,

            channel,

            sessionId:
                this.resolveSessionId(
                    session
                ),

            permissions

        };

        console.log(
            `[OpenClawProvider] 🚀 Agent: ${agent || "unknown"}`
        );

        console.log(
            `[OpenClawProvider] 🎯 Target: ${model}`
        );

        console.log(
            `[OpenClawProvider] 🔧 Tools disponíveis: ${toolDefinitions.length}`
        );

        /*
         * Executa o ciclo:
         *
         * OpenClaw
         *    ↓
         * tool_calls
         *    ↓
         * ToolManager
         *    ↓
         * resultado
         *    ↓
         * OpenClaw
         */
        for (
            let round = 0;
            round <= this.maxToolCalls;
            round++
        ) {

            const payload = {

                model,

                messages:
                    conversationMessages,

                user:
                    this.buildSessionUser(
                        session
                    ),

                stream: false

            };

            if (
                temperature !== undefined
            ) {

                payload.temperature =
                    temperature;

            }

            if (
                maxTokens !== undefined
            ) {

                payload.max_tokens =
                    maxTokens;

            }

            if (
                toolDefinitions.length > 0
            ) {

                payload.tools =
                    toolDefinitions;

                /*
                 * Temporariamente usamos required
                 * para validar o ciclo de Tool Calling.
                 *
                 * Depois que o fluxo estiver validado,
                 * podemos retornar para "auto".
                 */
                payload.tool_choice = "auto";
                   /* round === 0
                        ? "required"
                        : "auto";*/
            }

            console.log(
                "\n[OpenClawProvider] ===== REQUEST ====="
            );

            console.log(
                JSON.stringify(
                    {

                        round,

                        model:
                            payload.model,

                        tool_choice:
                            payload.tool_choice,

                        tools:
                            payload.tools?.map(
                                tool =>
                                    tool?.function?.name
                            ) || [],

                        messages:
                            payload.messages

                    },
                    null,
                    2
                )
            );

            console.log(
                "[OpenClawProvider] =========================\n"
            );

            try {

                const response =
                    await this.http.post(
                        "/chat/completions",
                        payload
                    );

                const data =
                    response.data;

                const choice =
                    data?.choices?.[0];

                if (!choice) {

                    throw new Error(
                        "OpenClaw não retornou choices."
                    );

                }

                console.log(
                    "[OpenClawProvider] 📨 finish_reason:",
                    choice.finish_reason
                );

                /*
                 * Resposta final.
                 */
                if (
                    choice.finish_reason !==
                    "tool_calls"
                ) {

                    console.log(
                        "[OpenClawProvider] ✅ Resposta final recebida."
                    );

                    return this.extractContent(
                        data
                    );

                }

                /*
                 * OpenClaw solicitou Tools.
                 */
                const toolCalls =
                    choice.message?.tool_calls ||
                    [];

                console.log(
                    "[OpenClawProvider] 🔧 Tool calls:",
                    JSON.stringify(
                        toolCalls,
                        null,
                        2
                    )
                );

                if (
                    toolCalls.length === 0
                ) {

                    throw new Error(
                        "OpenClaw informou tool_calls, mas não retornou chamadas."
                    );

                }

                /*
                 * A mensagem assistant contendo
                 * tool_calls precisa entrar no histórico
                 * antes das respostas das Tools.
                 */
                conversationMessages.push(
                    choice.message
                );

                for (
                    const toolCall
                    of toolCalls
                ) {

                    const toolName =
                        toolCall
                            ?.function
                            ?.name;

                    const argumentsText =
                        toolCall
                            ?.function
                            ?.arguments ||
                        "{}";

                    const toolCallId =
                        toolCall?.id;

                    console.log(
                        `[OpenClawProvider] 🔧 Executando Tool: ${toolName}`
                    );

                    console.log(
                        `[OpenClawProvider] 📥 Argumentos: ${argumentsText}`
                    );

                    if (!toolName) {

                        console.warn(
                            "[OpenClawProvider] ⚠ Tool call sem nome."
                        );

                        continue;

                    }

                    let argumentsObject;

                    try {

                        argumentsObject =
                            JSON.parse(
                                argumentsText
                            );

                    } catch (error) {

                        const invalidArguments =
                            {

                                error:
                                    "Argumentos da Tool não são JSON válidos."

                            };

                        conversationMessages.push({

                            role: "tool",

                            tool_call_id:
                                toolCallId,

                            content:
                                JSON.stringify(
                                    invalidArguments
                                )

                        });

                        continue;

                    }

                    let result;

                    try {

                        result =
                            await ToolManager.execute(

                                toolName,

                                argumentsObject,

                                toolContext

                            );

                        console.log(
                            `[OpenClawProvider] ✅ Tool executada: ${toolName}`
                        );

                        console.log(
                            `[OpenClawProvider] 📤 Resultado:`,
                            JSON.stringify(
                                result,
                                null,
                                2
                            )
                        );

                    } catch (error) {

                        console.error(
                            `[OpenClawProvider] ❌ Erro na Tool ${toolName}:`,
                            error.message
                        );

                        result = {

                            error:
                                error.message

                        };

                    }

                    /*
                     * Resultado da Tool retorna para
                     * o OpenClaw como role=tool.
                     */
                    conversationMessages.push({

                        role: "tool",

                        tool_call_id:
                            toolCallId,

                        content:
                            this.serializeToolResult(
                                result
                            )

                    });

                }

            } catch (error) {

                throw this.normalizeError(
                    error
                );

            }

        }

        throw new Error(
            `Limite de Tool Calling atingido (${this.maxToolCalls}).`
        );

    }

    async chat(request = {}) {

        return this.generate(
            request
        );

    }

    async stream(request = {}) {

        /*
         * Streaming de Tool Calling exige
         * processamento incremental dos eventos.
         *
         * Para o MVP mantemos execução
         * não-streaming.
         */

        return this.generate({

            ...request,

            stream: false

        });

    }

    async health() {

        const response =
            await this.http.get(
                "/models"
            );

        return {

            provider:
                this.name,

            status:
                response.status === 200
                    ? "healthy"
                    : "unhealthy",

            statusCode:
                response.status

        };

    }

    resolveAgentTarget(agent) {

        const agentMap = {

            sales:
                "openclaw/vendas-agent",

            support:
                "openclaw/suporte-agent",

            product:
                "openclaw/default",

            aiData:
                "openclaw/default",

            fallback:
                "openclaw/default"

        };

        return (
            agentMap[agent] ||
            this.agentTarget
        );

    }

    normalizeTools(tools) {

        if (
            !Array.isArray(tools)
        ) {

            return [];

        }

        return tools.filter(
            tool => {

                return (

                    tool &&

                    tool.type ===
                        "function" &&

                    tool.function &&

                    tool.function.name

                );

            }
        );

    }

    buildSessionUser(session) {

        if (!session) {

            return "conv:default";

        }

        const sessionId =
            this.resolveSessionId(
                session
            );

        return `conv:${sessionId}`;

    }

    resolveSessionId(session) {

        if (!session) {

            return "default";

        }

        if (
            typeof session === "string"
        ) {

            return session;

        }

        return (

            session.id ||

            session.key ||

            "default"

        );

    }

    serializeToolResult(result) {

        if (
            result === undefined
        ) {

            return JSON.stringify({

                result: null

            });

        }

        if (
            typeof result === "string"
        ) {

            return result;

        }

        try {

            return JSON.stringify(
                result
            );

        } catch (error) {

            return JSON.stringify({

                error:
                    "Resultado da Tool não pôde ser serializado."

            });

        }

    }

    extractContent(data) {

        const content =
            data
                ?.choices?.[0]
                ?.message
                ?.content;

        if (
            content === undefined ||
            content === null
        ) {

            return "";

        }

        return content;

    }

    normalizeError(error) {

        if (error.response) {

            const message =
                error.response.data
                    ?.error
                    ?.message ||
                `OpenClaw HTTP ${error.response.status}`;

            return new Error(
                message
            );

        }

        if (
            error.code ===
            "ECONNREFUSED"
        ) {

            return new Error(
                `Não foi possível conectar ao OpenClaw em ${this.baseUrl}`
            );

        }

        if (
            error.code ===
                "ETIMEDOUT" ||
            error.code ===
                "ECONNABORTED"
        ) {

            return new Error(
                "Timeout ao comunicar com o OpenClaw."
            );

        }

        return error;

    }

}

module.exports = OpenClawProvider;
