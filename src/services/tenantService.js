const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resolveTenantByTelegram(telegramId) {
  let user = await prisma.user.findFirst({
    where: { telegramId },
    include: { tenant: true }
  });

  if (!user) {
    const defaultTenant = await prisma.tenant.findFirst();

    user = await prisma.user.create({
      data: {
        telegramId,
        tenantId: defaultTenant.id
      },
      include: { tenant: true }
    });
  }

  return user.tenant;
}

module.exports = { resolveTenantByTelegram };
