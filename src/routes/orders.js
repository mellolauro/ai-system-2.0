const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

const {
  execFile
} = require("node:child_process");

const {
  promisify
} = require("node:util");

const execFileAsync =
  promisify(execFile);


// ==========================================
// NORMALIZAÇÃO DO TELEFONE WHATSAPP
// ==========================================

function normalizeWhatsAppPhone(phone) {

  if (!phone) {
    return null;
  }

  const digits =
    String(phone)
      .replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  /*
   * O OpenClaw espera E.164.
   *
   * Os usuários atuais já são armazenados
   * normalmente como:
   *
   * 5521986213555
   *
   * Então apenas acrescentamos "+".
   */
  return `+${digits}`;

}


// ==========================================
// MONTA TEXTO DA NOTIFICAÇÃO
// ==========================================

function buildNotificationMessage(
  order,
  trackingCode
) {

  const orderCode =
    order.id
      .slice(-8)
      .toUpperCase();

  const statusLabels = {

    PENDING:
      "Pendente",

    PROCESSING:
      "Em processamento",

    SHIPPED:
      "Enviado",

    DELIVERED:
      "Entregue",

    CANCELLED:
      "Cancelado"

  };

  const paymentLabels = {

    PENDING:
      "Pendente",

    PAID:
      "Pago",

    REFUNDED:
      "Reembolsado",

    FAILED:
      "Falhou",

    CANCELLED:
      "Cancelado"

  };

  const orderStatus =
    statusLabels[order.status] ||
    order.status;

  const paymentStatus =
    paymentLabels[
      order.paymentStatus
    ] ||
    order.paymentStatus;

  let message =
    `📦 Atualização do Pedido #${orderCode}\n\n` +
    `Status do pedido: ${orderStatus} (${order.status})\n` +
    `Pagamento: ${paymentStatus} (${order.paymentStatus})`;

  if (order.carrier) {

    message +=
      `\nTransportadora: ${order.carrier}`;

  }

  if (trackingCode) {

    message +=
      `\nCódigo de rastreio: ${trackingCode}`;

  }

  /*
   * Se houver entregador associado,
   * podemos apresentar também o nome
   * do responsável pela entrega.
   */
  const delivery =
    Array.isArray(order.deliveries) &&
    order.deliveries.length > 0
      ? order.deliveries[
          order.deliveries.length - 1
        ]
      : null;

  if (
    delivery &&
    delivery.driver
  ) {

    message +=
      `\nEntregador: ${delivery.driver.name}`;

  }

  message +=
    "\n\nVocê pode consultar o andamento do pedido a qualquer momento pelo atendimento.";

  return message;

}


// ==========================================
// NOTIFICAÇÃO VIA TELEGRAM
// ==========================================

async function sendTelegramNotification(
  user,
  message
) {

  if (
    !user ||
    !user.telegramId
  ) {

    return {
      attempted: false,
      success: false,
      channel: "telegram"
    };

  }

  const token =
    process.env.TELEGRAM_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {

    console.log(
      "⚠️ Token do Telegram não configurado."
    );

    return {
      attempted: false,
      success: false,
      channel: "telegram"
    };

  }

  try {

    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              chat_id:
                user.telegramId,

              text:
                message

            })

        }
      );

    const data =
      await response.json();

    if (!data.ok) {

      console.error(
        "❌ Erro da API do Telegram:",
        data.description
      );

      return {
        attempted: true,
        success: false,
        channel: "telegram"
      };

    }

    console.log(
      "✅ Notificação enviada via Telegram."
    );

    return {
      attempted: true,
      success: true,
      channel: "telegram"
    };

  } catch (error) {

    console.error(
      "❌ Erro ao enviar notificação Telegram:",
      error.message
    );

    return {
      attempted: true,
      success: false,
      channel: "telegram"
    };

  }

}


// ==========================================
// NOTIFICAÇÃO VIA WHATSAPP / OPENCLAW
// ==========================================

async function sendWhatsAppNotification(
  user,
  message
) {

  if (
    !user ||
    !user.phone
  ) {

    return {
      attempted: false,
      success: false,
      channel: "whatsapp"
    };

  }

  const target =
    normalizeWhatsAppPhone(
      user.phone
    );

  if (!target) {

    console.log(
      "⚠️ Telefone WhatsApp inválido."
    );

    return {
      attempted: false,
      success: false,
      channel: "whatsapp"
    };

  }

  /*
   * Permite configurar explicitamente
   * o binário se um dia for necessário.
   *
   * Hoje, como o comando "openclaw"
   * já funciona no ambiente, o valor
   * padrão é suficiente.
   */
  const openClawBin =
    process.env.OPENCLAW_BIN ||
    "openclaw";

  try {

    const {
      stdout,
      stderr
    } =
      await execFileAsync(
        openClawBin,
        [
          "message",
          "send",

          "--channel",
          "whatsapp",

          "--target",
          target,

          "--message",
          message,

          "--json"
        ],
        {

          /*
           * Não utilizamos shell.
           *
           * Isso evita interpretação de
           * caracteres da mensagem pelo shell.
           */
          shell:
            false,

          /*
           * Limite suficiente para o Gateway
           * efetuar o envio sem deixar a
           * requisição presa indefinidamente.
           */
          timeout:
            30000,

          maxBuffer:
            1024 * 1024

        }
      );

    if (
      stderr &&
      stderr.trim()
    ) {

      console.log(
        "[WhatsApp][OpenClaw]",
        stderr.trim()
      );

    }

    console.log(
      "✅ Notificação enviada via WhatsApp:",
      target
    );

    if (
      stdout &&
      stdout.trim()
    ) {

      console.log(
        "[WhatsApp][OpenClaw] envio concluído."
      );

    }

    return {
      attempted: true,
      success: true,
      channel: "whatsapp"
    };

  } catch (error) {

    console.error(
      "❌ Erro ao enviar notificação WhatsApp via OpenClaw:",
      error.message
    );

    if (
      error.stderr
    ) {

      console.error(
        "[WhatsApp][OpenClaw][stderr]",
        String(
          error.stderr
        ).trim()
      );

    }

    return {
      attempted: true,
      success: false,
      channel: "whatsapp"
    };

  }

}


// ==========================================
// FUNÇÃO CENTRAL DE NOTIFICAÇÃO
// ==========================================

async function sendNotification(
  user,
  order,
  trackingCode
) {

  if (!user) {

    console.log(
      "⚠️ Pedido sem usuário associado. Notificação não enviada."
    );

    return;

  }

  const message =
    buildNotificationMessage(
      order,
      trackingCode
    );

  const channels = [];

  /*
   * Cada identidade disponível recebe
   * a notificação pelo respectivo canal.
   *
   * Na prática:
   *
   * usuário criado via WhatsApp
   * normalmente possui phone;
   *
   * usuário criado via Telegram
   * normalmente possui telegramId.
   */

  if (user.phone) {

    channels.push(
      sendWhatsAppNotification(
        user,
        message
      )
    );

  }

  if (user.telegramId) {

    channels.push(
      sendTelegramNotification(
        user,
        message
      )
    );

  }

  if (
    channels.length === 0
  ) {

    console.log(
      "⚠️ Usuário não possui WhatsApp nem Telegram cadastrado."
    );

    return;

  }

  /*
   * allSettled impede que falha de um
   * canal impeça o envio pelo outro.
   */
  const results =
    await Promise.allSettled(
      channels
    );

  console.log(
    "[Notification] Resultado:",
    results.map(
      result =>
        result.status ===
        "fulfilled"
          ? result.value
          : {
              success:
                false,

              error:
                result.reason
                  ?.message ||
                String(
                  result.reason
                )
            }
    )
  );

}


// ==========================================
// LISTAGEM DE PEDIDOS
// Exibe apenas não ocultos
// ==========================================

router.get(
  "/",
  async (
    req,
    res,
    next
  ) => {

    try {

      const orders =
        await prisma.order.findMany({

          where: {
            hidden:
              false
          },

          include: {

            user:
              true,

            items: {

              include: {
                product:
                  true
              }

            }

          },

          orderBy: {
            createdAt:
              "desc"
          }

        });

      res.render(
        "orders",
        {
          orders
        }
      );

    } catch (error) {

      next(error);

    }

  }
);


// ==========================================
// DETALHES DO PEDIDO
// ==========================================

router.get(
  "/view/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const [
        order,
        drivers
      ] =
        await Promise.all([

          prisma.order.findUnique({

            where: {
              id:
                req.params.id
            },

            include: {

              user:
                true,

              tenant:
                true,

              deliveries: {

                include: {
                  driver:
                    true
                }

              },

              items: {

                include: {
                  product:
                    true
                }

              }

            }

          }),

          prisma.driver.findMany({

            where: {
              active:
                true
            },

            orderBy: {
              name:
                "asc"
            }

          })

        ]);

      if (!order) {

        return res
          .status(404)
          .send(
            "Pedido não encontrado"
          );

      }

      /*
       * O schema atual possui order.deliveries,
       * embora orderId em Delivery seja unique.
       *
       * Mantemos o array por compatibilidade
       * com o restante da aplicação.
       */
      const currentDelivery =
        order.deliveries &&
        order.deliveries.length > 0
          ? order.deliveries[
              order.deliveries.length - 1
            ]
          : null;

      res.render(
        "order-view",
        {
          order,
          drivers,
          currentDelivery
        }
      );

    } catch (error) {

      next(error);

    }

  }
);


// ==========================================
// IMPRESSÃO / RECIBO
// SEM LAYOUT PADRÃO
// ==========================================

router.get(
  "/print/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const order =
        await prisma.order.findUnique({

          where: {
            id:
              req.params.id
          },

          include: {

            user:
              true,

            tenant:
              true,

            items: {

              include: {
                product:
                  true
              }

            }

          }

        });

      if (!order) {

        return res
          .status(404)
          .send(
            "Pedido não encontrado"
          );

      }

      res.render(
        "order-print",
        {
          order,
          layout:
            false
        }
      );

    } catch (error) {

      next(error);

    }

  }
);


// ==========================================
// FORMULÁRIO NOVO PEDIDO
// ==========================================

router.get(
  "/new",
  async (
    req,
    res,
    next
  ) => {

    try {

      const [
        users,
        products,
        tenants
      ] =
        await Promise.all([

          prisma.user.findMany(),

          prisma.product.findMany({
            where: {
              active:
                true
            }
          }),

          prisma.tenant.findMany({
            where: {
              active:
                true
            }
          })

        ]);

      res.render(
        "order-form",
        {
          users,
          products,
          tenants
        }
      );

    } catch (error) {

      next(error);

    }

  }
);


// ==========================================
// ATUALIZAR STATUS & LOGÍSTICA
// ==========================================

router.post(
  "/update-status/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        id
      } =
        req.params;

      let {
        status,
        paymentStatus,
        trackingCode,
        carrier,
        driverId,
        notifyClient,
        cancelReason
      } =
        req.body;


      /*
       * Compatibilidade com nomenclatura
       * antiga utilizada em algumas telas.
       */
      if (
        status ===
        "CANCELED"
      ) {

        status =
          "CANCELLED";

      }


      /*
       * Atualiza o pedido.
       */
      await prisma.order.update({

        where: {
          id
        },

        data: {

          status,

          paymentStatus,

          trackingCode:
            trackingCode?.trim() ||
            null,

          carrier:
            carrier?.trim() ||
            null,

          cancelReason:
            status ===
            "CANCELLED"
              ? (
                  cancelReason?.trim() ||
                  null
                )
              : null,

          shippedAt:
            status ===
            "SHIPPED"
              ? new Date()
              : undefined,

          deliveredAt:
            status ===
            "DELIVERED"
              ? new Date()
              : undefined,

          cancelledAt:
            status ===
            "CANCELLED"
              ? new Date()
              : undefined,

          paidAt:
            paymentStatus ===
            "PAID"
              ? new Date()
              : undefined

        }

      });


      // ======================================
      // DELIVERY / ENTREGADOR
      // ======================================

      const existingDelivery =
        await prisma.delivery.findFirst({

          where: {
            orderId:
              id
          }

        });


      if (driverId) {

        if (existingDelivery) {

          await prisma.delivery.update({

            where: {
              id:
                existingDelivery.id
            },

            data: {

              driverId,

              status:
                status ||
                "PENDING"

            }

          });

        } else {

          const currentOrder =
            await prisma.order.findUnique({

              where: {
                id
              },

              select: {
                tenantId:
                  true
              }

            });

          await prisma.delivery.create({

            data: {

              orderId:
                id,

              driverId,

              status:
                status ||
                "PENDING",

              tenantId:
                currentOrder?.tenantId ||
                null

            }

          });

        }

      } else if (
        existingDelivery &&
        existingDelivery.driverId
      ) {

        /*
         * Se o administrador selecionar
         * "Nenhum / Sem Entregador",
         * removemos apenas a associação.
         *
         * A Delivery permanece porque agora
         * ela também contém o endereço de
         * destino do pedido.
         */
        await prisma.delivery.update({

          where: {
            id:
              existingDelivery.id
          },

          data: {

            driverId:
              null,

            status:
              status ||
              existingDelivery.status

          }

        });

      }


      /*
       * Faz nova leitura depois das alterações
       * para que a notificação use o estado
       * efetivamente persistido, inclusive
       * entregador associado.
       */
      const updatedOrder =
        await prisma.order.findUnique({

          where: {
            id
          },

          include: {

            user:
              true,

            deliveries: {

              include: {
                driver:
                  true
              }

            }

          }

        });


      if (!updatedOrder) {

        throw new Error(
          "Pedido não encontrado após atualização."
        );

      }


      // ======================================
      // NOTIFICAÇÃO DO CLIENTE
      // ======================================

      if (
        notifyClient ===
          "on" ||
        notifyClient ===
          "true"
      ) {

        await sendNotification(
          updatedOrder.user,
          updatedOrder,
          updatedOrder.trackingCode
        );

      }


      res.redirect(
        `/orders/view/${id}`
      );

    } catch (error) {

      next(error);

    }

  }
);


// ==========================================
// OCULTAR PEDIDO DA LISTAGEM
// SOFT DELETE
// ==========================================

router.post(
  "/hide/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        id
      } =
        req.params;

      await prisma.order.update({

        where: {
          id
        },

        data: {
          hidden:
            true
        }

      });

      res.redirect(
        "/orders"
      );

    } catch (error) {

      next(error);

    }

  }
);


module.exports =
  router;
