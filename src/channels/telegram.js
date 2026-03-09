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
    polling: true
  });

  bot.on("message", async (msg) => {
  if (!msg.text) return;

  try {

    const telegramId = String(msg.from.id);
    const text = msg.text.toLowerCase();

    if (!sessions[telegramId]) {
      sessions[telegramId] = { step: "start" };
    }

    const session = sessions[telegramId];

    // ============================
    // 1️⃣ Buscar usuário
    // ============================
    let user = await prisma.user.findUnique({
      where: { telegramId },
      include: { tenant: true }
    });

    // ============================
    // 2️⃣ Criar usuário automático
    // ============================
    if (!user) {

      const defaultTenant = await prisma.tenant.findFirst({
        where: { active: true }
      });

      if (!defaultTenant) {
        return bot.sendMessage(
          msg.chat.id,
          "Nenhum tenant configurado."
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

    // ============================
    // 🛒 FLUXO DE COMPRA
    // ============================

    // iniciar compra
    if (text === "comprar") {

      const products = await prisma.product.findMany({
        where: {
          tenantId: user.tenantId,
          active: true
        }
      });

      if (!products.length) {
        return bot.sendMessage(msg.chat.id, "Nenhum produto disponível.");
      }

      session.products = products;
      session.step = "choose_product";

      let message = "🛍 Escolha um produto:\n\n";

      products.forEach((p, i) => {
        message += `${i + 1}️⃣ ${p.name} - R$${p.price}\n`;
      });

      return bot.sendMessage(msg.chat.id, message);

    }

    // escolher produto
    if (session.step === "choose_product") {

      const index = parseInt(text) - 1;
      const product = session.products[index];

      if (!product) {
        return bot.sendMessage(msg.chat.id, "Produto inválido.");
      }

      session.product = product;
      session.step = "choose_quantity";

      return bot.sendMessage(msg.chat.id, "Quantas unidades?");

    }

    // escolher quantidade
    if (session.step === "choose_quantity") {

      const quantity = parseInt(text);

      if (!quantity || quantity <= 0) {
        return bot.sendMessage(msg.chat.id, "Quantidade inválida.");
      }

      const order = await createOrder(
        user.id,
        user.tenantId,
        session.product.id,
        quantity
      );

      session.step = "start";

      return bot.sendMessage(
        msg.chat.id,
        `✅ Pedido criado!\n\nProduto: ${session.product.name}\nQuantidade: ${quantity}\nTotal: R$${order.total}`
      );

    }

    // ============================
    // 🤖 IA (fluxo normal)
    // ============================

    const agentType = detectIntent(msg.text);

    const systemPrompt = buildSystemPrompt(agentType, user.tenant);

    const response = await orchestrateMessage({
      text: msg.text,
      user,
      channel: "telegram",
      agentType,
      systemPrompt
    });

    await bot.sendMessage(msg.chat.id, response);

  } catch (err) {

    console.error("Erro Telegram:", err);

    bot.sendMessage(msg.chat.id, "Erro interno.");

  }

});
  console.log("📲 Telegram ativo (multi-tenant + multi-agent).");
}

module.exports = { initTelegram };
