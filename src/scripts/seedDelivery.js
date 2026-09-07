import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Cria um entregador
  const driver = await prisma.deliveryDriver.upsert({
    where: { phone: '5521999998888' },
    update: {},
    create: {
      name: 'Carlos Silva',
      phone: '5521999998888',
      vehicle: 'Moto Honda CG 160'
    }
  });

  // 2. Cria o pedido
  const delivery = await prisma.delivery.upsert({
    where: { orderNumber: 'PED-1042' },
    update: {
      status: 'IN_TRANSIT',
      driverId: driver.id
    },
    create: {
      orderNumber: 'PED-1042',
      customerPhone: '5521988887777',
      status: 'IN_TRANSIT',
      driverId: driver.id
    }
  });

  // 3. Registra a posição GPS atual (Coordenadas de teste)
  await prisma.driverLocation.create({
    data: {
      driverId: driver.id,
      latitude: -22.7558,
      longitude: -43.4605
    }
  });

  console.log('✅ Dados de teste inseridos com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
