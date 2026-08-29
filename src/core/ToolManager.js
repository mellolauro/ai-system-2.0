const path = require("path");
const fs = require("fs");

class ToolManager {

    constructor() {

        this.tools = new Map();

    }

    register(name, tool) {

        if (!name) {

            throw new Error(
                "Nome da Tool é obrigatório."
            );

        }

        if (!tool) {

            throw new Error(
                `Tool "${name}" inválida.`
            );

        }

        if (
            typeof tool.execute !== "function"
        ) {

            throw new Error(
                `Tool "${name}" não possui execute().`
            );

        }

        this.tools.set(
            name,
            tool
        );

    }

    get(name) {

        return this.tools.get(name);

    }

    has(name) {

        return this.tools.has(name);

    }

    list() {

        return [
            ...this.tools.keys()
        ];

    }

    getTools(agent) {

        if (!agent) {

            return [];

        }

        const toolNames =
            agent.getTools();

        if (!Array.isArray(toolNames)) {

            return [];

        }

        return toolNames
            .map(toolName => {

                if (
                    typeof toolName !==
                    "string"
                ) {

                    return toolName;

                }

                return this.get(
                    toolName
                );

            })
            .filter(Boolean);

    }

    /*
     * Converte as Tools internas do AI-System
     * para o formato de Function Calling.
     *
     * Campos controlados pelo Kernel:
     *
     * tenantId
     * userId
     * sessionId
     * channel
     *
     * não são fornecidos pelo LLM.
     */
    getDefinitions(agent) {

        const tools =
            this.getTools(
                agent
            );

        return tools.map(
            tool => {

                const schema =
                    tool.schema || {

                        type:
                            "object",

                        properties:
                            {},

                        additionalProperties:
                            false

                    };

                const properties = {

                    ...(schema.properties || {})

                };

                const required =
                    Array.isArray(
                        schema.required
                    )

                        ? [
                            ...schema.required
                        ]

                        : [];

                /*
                 * Campos controlados
                 * pelo Kernel.
                 */
                const trustedFields = [

                    "tenantId",
                    "userId",
                    "sessionId",
                    "channel"

                ];

                for (
                    const field
                    of trustedFields
                ) {

                    delete properties[
                        field
                    ];

                    const index =
                        required.indexOf(
                            field
                        );

                    if (
                        index !== -1
                    ) {

                        required.splice(
                            index,
                            1
                        );

                    }

                }

                return {

                    type:
                        "function",

                    function: {

                        name:
                            tool.name,

                        description:
                            tool.description ||
                            "",

                        parameters: {

                            ...schema,

                            type:
                                schema.type ||
                                "object",

                            properties,

                            required,

                            additionalProperties:
                                schema.additionalProperties ??
                                false

                        }

                    }

                };

            }
        );

    }

    async execute(
        name,
        params = {},
        context = {}
    ) {

        const tool =
            this.get(
                name
            );

        if (!tool) {

            throw new Error(
                `Tool "${name}" não encontrada.`
            );

        }

        /*
         * Parâmetros enviados pelo LLM.
         *
         * Fazemos uma cópia antes
         * de acrescentar dados confiáveis.
         */
        const safeParams = {

            ...params

        };

        /*
         * Contexto confiável da aplicação.
         *
         * Esses valores sempre sobrescrevem
         * qualquer valor eventualmente enviado
         * pelo modelo.
         */

        if (
            context.tenantId !== undefined
        ) {

            safeParams.tenantId =
                context.tenantId;

        }

        if (
            context.userId !== undefined
        ) {

            safeParams.userId =
                context.userId;

        }

        if (
            context.sessionId !== undefined
        ) {

            safeParams.sessionId =
                context.sessionId;

        }

        if (
            context.channel !== undefined
        ) {

            safeParams.channel =
                context.channel;

        }

        /*
         * userRole NÃO é colocado em safeParams.
         *
         * Ele é contexto confiável do Kernel,
         * não argumento da Tool fornecido pelo LLM.
         *
         * O contexto completo será enviado
         * separadamente ao execute() da Tool.
         */

        /*
         * Validação de permissões.
         */

        if (
            Array.isArray(
                tool.permissions
            ) &&
            tool.permissions.length > 0
        ) {

            const agentPermissions =
                Array.isArray(
                    context.permissions
                )

                    ? context.permissions

                    : [];

            const authorized =
                tool.permissions.every(
                    permission =>
                        agentPermissions.includes(
                            permission
                        )
                );

            if (!authorized) {

                throw new Error(
                    `Agente não possui permissão para executar "${name}".`
                );

            }

        }

        /*
         * Executa a Tool.
         *
         * IMPORTANTE:
         *
         * O segundo argumento é o contexto
         * confiável do Kernel.
         *
         * Assim uma Tool poderá acessar,
         * por exemplo:
         *
         * context.userRole
         * context.permissions
         * context.channel
         */
        return tool.execute(
            safeParams,
            context
        );

    }

    load(directory) {

        if (
            !fs.existsSync(
                directory
            )
        ) {

            return;

        }

        const walk =
            dir => {

                const files =
                    fs.readdirSync(
                        dir
                    );

                for (
                    const file
                    of files
                ) {

                    const fullPath =
                        path.join(
                            dir,
                            file
                        );

                    const stat =
                        fs.statSync(
                            fullPath
                        );

                    if (
                        stat.isDirectory()
                    ) {

                        walk(
                            fullPath
                        );

                        continue;

                    }

                    if (
                        !file.endsWith(
                            ".js"
                        )
                    ) {

                        continue;

                    }

                    /*
                     * Evita carregar
                     * o próprio Loader.
                     */
                    if (
                        file ===
                        "Loader.js"
                    ) {

                        continue;

                    }

                    delete require.cache[
                        require.resolve(
                            fullPath
                        )
                    ];

                    const tool =
                        require(
                            fullPath
                        );

                    /*
                     * Somente Tools que seguem
                     * o contrato novo são registradas.
                     */
                    if (
                        !tool ||
                        !tool.name ||
                        typeof tool.execute !==
                            "function"
                    ) {

                        continue;

                    }

                    this.register(
                        tool.name,
                        tool
                    );

                    console.log(
                        `🔧 Tool carregada: ${tool.name}`
                    );

                }

            };

        walk(
            directory
        );

    }

}

module.exports =
    new ToolManager();
