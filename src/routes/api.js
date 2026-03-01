const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.post("/tenant", async (req, res) => {
  const { name, agentName } = req.body;

  const tenant = await prisma.tenant.create({
    data: { name, agentName }
  });

  res.json(tenant);
});

module.exports = router;
