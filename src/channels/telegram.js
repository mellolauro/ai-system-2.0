const TelegramBot = require("node-telegram-bot-api");
const prisma = require("../prisma");
const { orchestrateMessage } = require("../orchestrator/orchestrator");

function initTelegram() {
  if (!process.env.TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN não definido no .env");
    return;
  }

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: true
  });

  bot.on("message", async (msg) => {
    if (!msg.text) return;

    try {
      const telegramId = String(msg.from.id);

      /**
       * 1️⃣ Buscar usuário
       */
      let user = await prisma.user.findUnique({
        where: { telegramId },
        include: { tenant: true }
      });

      /**
       * 2️⃣ Se não existir, criar automaticamente no tenant default
       */
      if (!user) {
        const defaultTenant = await prisma.tenant.findFirst();

        if (!defaultTenant) {
          return bot.sendMessage(
            msg.chat.id,
            "Nenhum tenant configurado no sistema."
          );
        }

        user = await prisma.user.create({
          data: {
            telegramId,
            name: msg.from.first_name || "User",
            tenantId: defaultTenant.id
          },
          include: { tenant: true }
        });
      }

      /**
       * 3️⃣ Orquestrar mensagem
       */
      const response = await orchestrateMessage({
        text: msg.text,
        user,
        channel: "telegram"
      });

      await bot.sendMessage(msg.chat.id, response);
    } catch (err) {
      console.error("Erro Telegram:", err);
      bot.sendMessage(msg.chat.id, "Erro interno.");
    }
  });

  console.log("📲 Telegram ativo (multi-tenant).");
}

module.exports = { initTelegram };
