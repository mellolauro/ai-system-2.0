const crypto = require("crypto");
require("dotenv").config();

const prisma = require("../src/prisma");

function normalizePhone(value) {
  return String(value || "").trim();
}

function normalizeDeviceName(value) {
  const name = String(value || "").trim();

  return name || "Dispositivo GPS";
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

  const deviceName =
    normalizeDeviceName(
      process.argv.slice(3).join(" ")
    );

  if (!phone) {
    console.error(
      "Uso: node scripts/provision-driver-tracking.js <telefone> [nome do dispositivo]"
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

  const device =
    await prisma.driverTrackingDevice.create({
      data: {
        driverId: driver.id,
        tokenHash,
        name: deviceName
      },
      select: {
        id: true,
        name: true
      }
    });

  console.log("");
  console.log("Dispositivo GPS provisionado.");
  console.log(`Entregador: ${driver.name}`);
  console.log(`Telefone: ${driver.phone}`);
  console.log(`Dispositivo: ${device.name}`);
  console.log(`Device ID: ${device.id}`);
  console.log("");
  console.log("TOKEN (exibido somente agora):");
  console.log(token);
  console.log("");
  console.log(
    "Guarde esta credencial com segurança."
  );
  console.log(
    "Este token autentica somente este dispositivo."
  );
}

main()
  .catch(error => {
    console.error(
      "Erro ao provisionar dispositivo GPS:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
