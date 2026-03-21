const sessions = {};
const TelegramBot = require("node-telegram-bot-api");
const prisma = require("../prisma");
const { orchestrateMessage } = require("../orchestrator/orchestrator");
const { detectIntent } = require("../services/agentRouter");
const { buildSystemPrompt } = require("../services/agents");
const { createOrder } = require("../services/orderService");

function initTelegram() {

  if (!process.env.TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN não definido no .env");
    return;
  }

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
     polling: {
     interval: 1000,
     autoStart: true,
     params: {
       timeout: 10
    }
  }
});

  bot.on("message", async (msg) => {

    if (!msg.text) return;

    const telegramId = String(msg.from.id);
    const text = msg.text.toLowerCase();

    // 🧠 sessão
    if (!sessions[telegramId]) {
      sessions[telegramId] = { step: "start", processing: false };
    }

    const session = sessions[telegramId];

    // 🚫 evita flood
    if (session.processing) {
      return bot.sendMessage(msg.chat.id, "⏳ Aguarde...");
    }

    session.processing = true;

    try {

      // ============================
      // 1️⃣ USER
      // ============================
      let user = await prisma.user.findUnique({
        where: { telegramId },
        include: { tenant: true }
      });

      if (!user) {

        const defaultTenant = await prisma.tenant.findFirst({
          where: { active: true }
        });

        if (!defaultTenant) {
          session.processing = false;
          return bot.sendMessage(msg.chat.id, "Nenhum tenant configurado.");
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

      // ============================
      // 🛒 FLUXO DE COMPRA
      // ============================

      if (text === "comprar") {

        const products = await prisma.product.findMany({
          where: {
            tenantId: user.tenantId,
            active: true
          }
        });

        if (!products.length) {
          session.processing = false;
          return bot.sendMessage(msg.chat.id, "Nenhum produto disponível.");
        }

        session.products = products;
        session.step = "choose_product";

        let message = "🛍 Escolha um produto:\n\n";

        products.forEach((p, i) => {
          message += `${i + 1}️⃣ ${p.name} - R$${p.price}\n`;
        });

        session.processing = false;
        return bot.sendMessage(msg.chat.id, message);

      }

      if (session.step === "choose_product") {

        const index = parseInt(text) - 1;
        const product = session.products[index];

        if (!product) {
          session.processing = false;
          return bot.sendMessage(msg.chat.id, "Produto inválido.");
        }

        session.product = product;
        session.step = "choose_quantity";

        session.processing = false;
        return bot.sendMessage(msg.chat.id, "Quantas unidades?");

      }

      if (session.step === "choose_quantity") {

        const quantity = parseInt(text);

        if (!quantity || quantity <= 0) {
          session.processing = false;
          return bot.sendMessage(msg.chat.id, "Quantidade inválida.");
        }

        const order = await createOrder(
          user.id,
          user.tenantId,
          session.product.id,
          quantity
        );

        session.step = "start";

        session.processing = false;

        return bot.sendMessage(
          msg.chat.id,
          `✅ Pedido criado!\n\nProduto: ${session.product.name}\nQuantidade: ${quantity}\nTotal: R$${order.total}`
        );

      }

      // ============================
      // 🤖 IA
      // ============================

      bot.sendChatAction(msg.chat.id, "typing");

      const agentType = detectIntent(msg.text);
      const systemPrompt = buildSystemPrompt(agentType, user.tenant);

      let partial = "";

      const response = await orchestrateMessage({
        session, // 🔥 IMPORTANTE
        message: msg.text,
        text: msg.text,
        user,
        channel: "telegram",
        agentType,
        systemPrompt,

        // 🔥 STREAMING (opcional)
        onStream: (chunk) => {
          partial += chunk;
        }
      });

      await bot.sendMessage(
        msg.chat.id,
        response || partial || "Sem resposta."
      );

    } catch (err) {

      console.error("Erro Telegram:", err);

      await bot.sendMessage(
        msg.chat.id,
        "⚠️ Erro interno. Tente novamente."
      );

    } finally {

      session.processing = false;

    }

  });

  console.log("📲 Telegram ativo (multi-tenant + multi-agent).");

}

module.exports = { initTelegram };
