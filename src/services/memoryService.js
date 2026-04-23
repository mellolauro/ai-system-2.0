const prisma = require("../prisma");

async function setMemory(userId, key, value) {
  return prisma.userMemory.upsert({
    where: {
      userId_key: { userId, key }
    },
    update: { value },
    create: { userId, key, value }
  });
}

async function getMemory(userId) {
  const memories = await prisma.userMemory.findMany({
    where: { userId }
  });

  const map = {};
  memories.forEach(m => map[m.key] = m.value);

  return map;
}

module.exports = { setMemory, getMemory };
