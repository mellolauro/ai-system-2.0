const axios = require("axios");

async function sendMessage(
    externalUserId,
    message
) {

    const response =
        await axios.post(

            "http://127.0.0.1:3000/api/chat",

            {

                tenantId:
                    process.env.TEST_TENANT_ID,

                userId:
                    process.env.TEST_USER_ID,

                channel:
                    "api",

                externalUserId,

                message

            }

        );

    return response.data;

}

async function test() {

    console.log(
        "🔗 Testando conversa multi-mensagem..."
    );

    const externalUserId =
        `conversation-test-${Date.now()}`;

    try {

        console.log("\n========== MENSAGEM 1 ==========\n");

        const first =
            await sendMessage(

                externalUserId,

                "Qual é o status do meu pedido?"

            );

        console.log(
            JSON.stringify(
                first,
                null,
                2
            )
        );

        console.log("\n========== MENSAGEM 2 ==========\n");

        const second =
            await sendMessage(

                externalUserId,

                "Qual é o status do meu último pedido?"

            );

        console.log(
            JSON.stringify(
                second,
                null,
                2
            )
        );

        console.log(
            "\n✅ Conversa concluída."
        );

        console.log(
            "\nConversation 1:",
            first.data.conversation.id
        );

        console.log(
            "Conversation 2:",
            second.data.conversation.id
        );

        console.log(
            "\nSession 1:",
            first.data.session.key
        );

        console.log(
            "Session 2:",
            second.data.session.key
        );

    } catch (error) {

        console.error(
            "\n❌ ERRO:"
        );

        console.error(
            error.response?.data ||
            error.message
        );

    }

}

test();
