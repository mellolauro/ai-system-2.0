const prisma = require("../prisma");

async function buildContext(userId, tenantId) {

  const messages = await prisma.message.findMany({
    where: {
      conversation: {
        userId,
        tenantId
      }
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return messages.reverse().map(m => ({
    role: m.role,
    content: m.content
  }));
}

module.exports = { buildContext };
