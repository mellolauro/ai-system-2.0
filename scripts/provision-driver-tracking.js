const crypto = require("crypto");
require("dotenv").config();

const prisma = require("../src/prisma");

function normalizePhone(value) {
  return String(value || "").trim();
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function main() {
  const phone = normalizePhone(
    process.argv[2]
  );

  if (!phone) {
    console.error(
      "Uso: node scripts/provision-driver-tracking.js <telefone>"
    );
    process.exitCode = 1;
    return;
  }

  const driver =
    await prisma.driver.findUnique({
      where: {
        phone
      },
      select: {
        id: true,
        name: true,
        phone: true,
        active: true,
        tenantId: true
      }
    });

  if (!driver) {
    console.error(
      "Entregador não encontrado."
    );
    process.exitCode = 1;
    return;
  }

  if (!driver.active) {
    console.error(
      "Entregador está inativo."
    );
    process.exitCode = 1;
    return;
  }

  if (!driver.tenantId) {
    console.error(
      "Entregador não possui tenant associado."
    );
    process.exitCode = 1;
    return;
  }

  const token =
    crypto.randomBytes(32).toString("hex");

  const tokenHash =
    hashToken(token);

  await prisma.driver.update({
    where: {
      id: driver.id
    },
    data: {
      trackingTokenHash: tokenHash
    }
  });

  console.log("");
  console.log("Credencial GPS provisionada.");
  console.log(`Entregador: ${driver.name}`);
  console.log(`Telefone: ${driver.phone}`);
  console.log("");
  console.log("TOKEN (exibido somente agora):");
  console.log(token);
  console.log("");
  console.log(
    "Guarde esta credencial com segurança."
  );
  console.log(
    "Executar novamente este script revoga o token anterior."
  );
}

main()
  .catch(error => {
    console.error(
      "Erro ao provisionar credencial GPS:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
