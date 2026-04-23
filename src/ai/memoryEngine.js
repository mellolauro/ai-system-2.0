const prisma = require("../prisma");

async function loadMemory(userId) {
  const memories = await prisma.userMemory.findMany({
    where: { userId }
  });

  const map = {};
  memories.forEach(m => map[m.key] = m.value);

  return map;
}

async function saveMemory(userId, updates = {}) {

  for (const key of Object.keys(updates)) {
    await prisma.userMemory.upsert({
      where: {
        userId_key: { userId, key }
      },
      update: { value: String(updates[key]) },
      create: {
        userId,
        key,
        value: String(updates[key])
      }
    });
  }
}

module.exports = { loadMemory, saveMemory };
