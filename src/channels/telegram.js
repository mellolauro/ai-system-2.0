const sessions = {};
const TelegramBot = require("node-telegram-bot-api");
const prisma = require("../prisma");

// ✅ NOVO ORCHESTRATOR
const { handleMessage } = require("../orchestrator");

// ✅ SAFE SEND
const { sendTelegramSafe } = require("./utils/sendSafe");

// ❌ NÃO USAR MAIS
// const { detectIntent } = require("../services/agentRouter");
// const { buildSystemPrompt } = require("../services/agents");

// ⚠️ createOrder só via agent agora (não direto aqui)
// const { createOrder } = require("../services/orderService");

function initTelegram() {

  if (!process.env.TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN não definido no .env");
    return;
  }

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: {
      interval: 1000,
      autoStart: true,
      params: { timeout: 10 }
    }
  });

  bot.on("message", async (msg) => {

    if (!msg.text) return;

    const telegramId = String(msg.from.id);
    const text = msg.text.trim().toLowerCase();

    // ============================
    // 🧠 SESSION
    // ============================
    if (!sessions[telegramId]) {
      sessions[telegramId] = {
        step: "start",
        processing: false
      };
    }

    const session = sessions[telegramId];

    // 🚫 anti flood
    if (session.processing) {
      return sendTelegramSafe(bot, msg.chat.id, "⏳ Aguarde...");
    }

    session.processing = true;

    try {

      // ============================
      // 👤 USER / TENANT
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
          return sendTelegramSafe(bot, msg.chat.id, "Nenhum tenant configurado.");
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
      // 🛒 FLUXO DE COMPRA (CONTROLADO)
      // ============================

      if (text === "comprar") {

        const products = await prisma.product.findMany({
          where: {
            tenantId: user.tenantId,
            active: true
          }
        });

        if (!products.length) {
          return sendTelegramSafe(bot, msg.chat.id, "Nenhum produto disponível.");
        }

        session.products = products;
        session.step = "choose_product";

        let message = "🛍️ Escolha um produto:\n\n";

        products.forEach((p, i) => {
          message += `${i + 1}️⃣ ${p.name} - R$${p.price}\n`;
        });

        return sendTelegramSafe(bot, msg.chat.id, message);
      }

      if (session.step === "choose_product") {

        const index = parseInt(text) - 1;
        const product = session.products?.[index];

        if (!product) {
          return sendTelegramSafe(bot, msg.chat.id, "Produto inválido.");
        }

        session.product = product;
        session.step = "choose_quantity";

        return sendTelegramSafe(bot, msg.chat.id, "Quantas unidades?");
      }

      if (session.step === "choose_quantity") {

        const quantity = parseInt(text);

        if (!quantity || quantity <= 0) {
          return sendTelegramSafe(bot, msg.chat.id, "Quantidade inválida.");
        }

        // ✅ monta cart corretamente
        const cart = {
          items: [
            {
              productId: session.product.id,
              qty: quantity,
              price: session.product.price
            }
          ]
        };

        const { createOrder } = require("../services/orderService");

        const order = await createOrder(
          user.id,
          user.tenantId,
          cart
        );

        session.step = "start";
        session.product = null;

        return sendTelegramSafe(
          bot,
          msg.chat.id,
          `✅ Pedido criado!

📦 Produto: ${order.items?.[0]?.productId || session.product.name}
🔢 Quantidade: ${quantity}
💰 Total: R$ ${order.total}`
        );
      }

      // ============================
      // 🤖 IA (MULTI-AGENT REAL)
      // ============================

      await bot.sendChatAction(msg.chat.id, "typing");

      const response = await handleMessage({
        text: msg.text,
        sessionId: `tg-${msg.chat.id}`,
        tenantId: user.tenantId,
        user,
        session
      });

      await sendTelegramSafe(
        bot,
        msg.chat.id,
        response || "Sem resposta."
      );

    } catch (err) {

      console.error("🔥 ERRO COMPLETO:", err.stack);

      await sendTelegramSafe(
        bot,
        msg.chat.id,
        "❌ Erro interno. Tente novamente."
      );

    } finally {
      session.processing = false;
    }

  });

  console.log("🤖 Telegram ativo (multi-tenant + multi-agent).");
}

module.exports = { initTelegram };
