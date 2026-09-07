const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// ==========================================
// FUNÇÃO AUXILIAR DE NOTIFICAÇÃO
// ==========================================
async function sendNotification(user, order, trackingCode) {
  const orderCode = order.id.slice(-8).toUpperCase();
  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("⚠️ TELEGRAM_TOKEN não configurado no .env");
    return;
  }

  if (!user || !user.telegramId) {
    console.log("⚠️ Usuário do pedido não possui telegramId cadastrado no banco de dados");
    return;
  }

  try {
    const message = `📦 *Atualização do seu Pedido #${orderCode}*\n\n` +
                    `Status do Pedido: *${order.status}*\n` +
                    `Pagamento: *${order.paymentStatus}*\n` +
                    (trackingCode ? `Rastreio: \`${trackingCode}\`\n` : '') +
                    `\nObrigado por comprar conosco!`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text: message,
        parse_mode: "Markdown"
      })
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("❌ Erro da API do Telegram:", data.description);
    } else {
      console.log("✅ Notificação enviada com sucesso via Telegram!");
    }
  } catch (err) {
    console.error("❌ Erro ao enviar notificação Telegram:", err.message);
  }
}

// ==========================================
// LISTAGEM DE PEDIDOS (Exibe apenas não ocultos)
// ==========================================
router.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { hidden: false },
      include: {
        user: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.render("orders", { orders });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// DETALHES DO PEDIDO
// ==========================================
router.get("/view/:id", async (req, res, next) => {
  try {
    const [order, drivers] = await Promise.all([
      prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          user: true,
          tenant: true,
          deliveries: {
            include: { driver: true }
          },
          items: {
            include: { product: true }
          }
        }
      }),
      prisma.driver.findMany({ 
        where: { active: true },
        orderBy: { name: "asc" } 
      })
    ]);

    if (!order) {
      return res.status(404).send("Pedido não encontrado");
    }

    // Extrai a última entrega atribuída ao pedido
    const currentDelivery = order.deliveries && order.deliveries.length > 0 
      ? order.deliveries[order.deliveries.length - 1] 
      : null;

    res.render("order-view", { order, drivers, currentDelivery });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// IMPRESSÃO / RECIBO (SEM LAYOUT PADRÃO)
// ==========================================
router.get("/print/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        tenant: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).send("Pedido não encontrado");
    }

    res.render("order-print", { order, layout: false });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// FORMULÁRIO NOVO PEDIDO
// ==========================================
router.get("/new", async (req, res, next) => {
  try {
    const [users, products, tenants] = await Promise.all([
      prisma.user.findMany(),
      prisma.product.findMany({ where: { active: true } }),
      prisma.tenant.findMany({ where: { active: true } })
    ]);

    res.render("order-form", { users, products, tenants });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ATUALIZAR STATUS & LOGÍSTICA (POST)
// ==========================================
router.post("/update-status/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, paymentStatus, trackingCode, carrier, driverId, notifyClient, cancelReason } = req.body;

    if (status === "CANCELED") {
      status = "CANCELLED";
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        paymentStatus,
        trackingCode: trackingCode || null,
        carrier: carrier || null,
        cancelReason: status === "CANCELLED" ? (cancelReason || null) : null,
        shippedAt: status === "SHIPPED" ? new Date() : undefined,
        deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
        paidAt: paymentStatus === "PAID" ? new Date() : undefined
      },
      include: { user: true }
    });

    if (driverId) {
      const existingDelivery = await prisma.delivery.findFirst({
        where: { orderId: id }
      });

      if (existingDelivery) {
        await prisma.delivery.update({
          where: { id: existingDelivery.id },
          data: { driverId, status: status || "PENDING" }
        });
      } else {
        await prisma.delivery.create({
          data: {
            orderId: id,
            driverId,
            status: status || "PENDING",
            tenantId: updatedOrder.tenantId
          }
        });
      }
    }

    if (notifyClient === "on" || notifyClient === "true") {
      await sendNotification(updatedOrder.user, updatedOrder, trackingCode);
    }

    res.redirect(`/orders/view/${id}`);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// OCULTAR PEDIDO DA LISTAGEM (SOFT DELETE)
// ==========================================
router.post("/hide/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.order.update({
      where: { id },
      data: { hidden: true }
    });
    res.redirect("/orders");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
