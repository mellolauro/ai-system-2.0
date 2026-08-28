const fs = require("fs");
const path = require("path");

async function sendTelegramSafe(
    bot,
    chatId,
    text
) {

    const MAX = 4000;

    if (!text) {

        return;

    }

    if (text.length <= MAX) {

        return bot.sendMessage(
            chatId,
            text
        );

    }

    const parts = [];

    for (
        let i = 0;
        i < text.length;
        i += MAX
    ) {

        parts.push(
            text.slice(
                i,
                i + MAX
            )
        );

    }

    for (
        const part
        of parts
    ) {

        await bot.sendMessage(
            chatId,
            part
        );

    }

}

function resolveMediaPath(mediaPath) {

    if (!mediaPath) {

        return null;

    }

    const value =
        String(mediaPath).trim();

    if (!value) {

        return null;

    }

    const projectRoot =
        path.resolve(
            __dirname,
            "../../.."
        );

    /*
     * /uploads/products/...
     */
    if (
        value.startsWith("/uploads/")
    ) {

        return path.join(
            projectRoot,
            "public",
            value.replace(
                /^\/+/,
                ""
            )
        );

    }

    /*
     * uploads/products/...
     */
    if (
        value.startsWith("uploads/")
    ) {

        return path.join(
            projectRoot,
            "public",
            value
        );

    }

    /*
     * Caminho absoluto.
     */
    if (
        path.isAbsolute(value)
    ) {

        return value;

    }

    return path.join(
        projectRoot,
        "public",
        value
    );

}

async function sendTelegramMedia(
    bot,
    chatId,
    media = []
) {

    if (
        !Array.isArray(media) ||
        media.length === 0
    ) {

        return;

    }

    for (
        const item
        of media
    ) {

        if (!item) {

            continue;

        }

        if (
            item.type !==
            "image"
        ) {

            continue;

        }

        const filePath =
            resolveMediaPath(
                item.path ||
                item.url
            );

        if (!filePath) {

            console.error(
                "[Telegram] Caminho da imagem não informado."
            );

            continue;

        }

        if (
            !fs.existsSync(
                filePath
            )
        ) {

            console.error(
                `[Telegram] Imagem não encontrada: ${filePath}`
            );

            continue;

        }

        try {

            await bot.sendPhoto(
                chatId,
                filePath
            );

        } catch (error) {

            console.error(
                `[Telegram] Erro ao enviar imagem ${filePath}:`,
                error.message
            );

        }

    }

}

module.exports = {

    sendTelegramSafe,

    sendTelegramMedia

};
