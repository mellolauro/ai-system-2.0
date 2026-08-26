const axios = require("axios");

async function test() {

    console.log(
        "🔗 Testando conversa administrativa..."
    );

    try {

        const response =
            await axios.post(
                "http://127.0.0.1:3000/api/chat",
                {
                    tenantId:
                        "cmobzu3ux000085nscn2q22kt",

                    userId:
                        "cmoc0n5gl000y85nsh8308yg4",

                    channel:
                        "api",

                    externalUserId:
                        `admin-test-${Date.now()}`,

                    agentContext:
                        "admin",

                    message:
                        "Cancele o pedido cmt3gg9ba000185wxx25ffkzc"
                }
            );

        console.log("");

        console.log(
            "HTTP Status:",
            response.status
        );

        console.log("");

        console.log(
            JSON.stringify(
                response.data,
                null,
                2
            )
        );

    } catch (error) {

        console.error("");

        console.error(
            "❌ Erro:",
            error.response?.data ||
            error.message
        );

    }

}

test();
