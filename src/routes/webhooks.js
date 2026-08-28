const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// Função de notificação via Telegram
async function sendNotification(user, order, trackingCode) {
  const orderCode = order.id.slice(-8).toUpperCase();
  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !user || !user.telegramId) return;

  try {
    const message = `📦 *Atualização do seu Pedido #${orderCode}*\n\n` +
                    `Status do Pedido: *${order.status}*\n` +
                    `Pagamento: *${order.paymentStatus}*\n` +
                    (trackingCode ? `Rastreio: \`${trackingCode}\`\n` : '') +
                    `\nObrigado por comprar conosco!`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    console.error("❌ Erro ao enviar notificação no Webhook:", err.message);
  }
}

// POST /webhooks/tracking
router.post("/tracking", async (req, res) => {
  try {
    const { trackingCode, status, carrier } = req.body;

    if (!trackingCode || !status) {
      return res.status(400).json({ error: "Campos 'trackingCode' e 'status' são obrigatórios." });
    }

    // Localiza o pedido pelo código de rastreio
    const order = await prisma.order.findFirst({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado para este código de rastreio." });
    }

    // Mapeia status externos para os Enums do Prisma
    let newStatus = order.status;
    const normalizedStatus = status.toUpperCase();

    if (["DELIVERED", "ENTREGUE"].includes(normalizedStatus)) {
      newStatus = "DELIVERED";
    } else if (["SHIPPED", "EM_TRANSITO", "ENVIADO"].includes(normalizedStatus)) {
      newStatus = "SHIPPED";
    } else if (["CANCELLED", "CANCELED", "CANCELADO"].includes(normalizedStatus)) {
      newStatus = "CANCELLED";
    }

    // Atualiza o status no banco de dados
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        carrier: carrier || order.carrier,
        shippedAt: newStatus === "SHIPPED" && !order.shippedAt ? new Date() : order.shippedAt,
        deliveredAt: newStatus === "DELIVERED" ? new Date() : order.deliveredAt,
        cancelledAt: newStatus === "CANCELLED" ? new Date() : order.cancelledAt
      },
      include: { user: true }
    });

    // Dispara a notificação automática para o cliente
    await sendNotification(updatedOrder.user, updatedOrder, updatedOrder.trackingCode);

    return res.status(200).json({
      success: true,
      message: `Status do pedido #${order.id.slice(-8).toUpperCase()} atualizado para ${newStatus}.`
    });

  } catch (err) {
    console.error("❌ Erro ao processar webhook de rastreio:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

module.exports = router;
