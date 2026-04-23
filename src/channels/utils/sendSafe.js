async function sendTelegramSafe(bot, chatId, text) {
    const MAX = 4000;

    if (!text) return;

    if (text.length <= MAX) {
        return bot.sendMessage(chatId, text);
    }

    const parts = [];

    for (let i = 0; i < text.length; i += MAX) {
        parts.push(text.slice(i, i + MAX));
    }

    for (const part of parts) {
        await bot.sendMessage(chatId, part);
    }
}

module.exports = { sendTelegramSafe };
