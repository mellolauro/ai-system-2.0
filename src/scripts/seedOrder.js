// src/scripts/seedOrder.js
const prisma = require("../prisma");

async function main() {
    // 1. Obtém ou cria o Tenant com todos os campos obrigatórios
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: "Empresa de Teste",
                agentName: "Atendente IA",
                plan: "free"
            }
        });
        console.log("🏢 Tenant de teste criado:", tenant.id);
    } else {
        console.log("🏢 Usando Tenant existente:", tenant.id);
    }

    const tenantId = tenant.id;
    const userId = "user_123";

    // 2. Garante o Usuário (role padrão USER)
    const user = await prisma.user.upsert({
        where: { id: userId },
        update: { tenantId },
        create: {
            id: userId,
            tenantId,
            name: "Cliente Teste",
            role: "USER"
        }
    });
    console.log("👤 Usuário de teste pronto:", user.id);

    // 3. Garante o Driver (Entregador)
    const driver = await prisma.driver.upsert({
        where: { id: "driver_01" },
        update: { tenantId, active: true },
        create: {
            id: "driver_01",
            tenantId,
            name: "Carlos Entregador",
            phone: "+5521999999999",
            vehicle: "Moto Honda CG 160",
            plate: "ABC-1D23",
            active: true
        }
    });
    console.log("🛵 Entregador pronto:", driver.id);

    // 4. Cria ou atualiza o Pedido (Order)
    const order = await prisma.order.upsert({
        where: { id: "PED-1042" },
        update: {
            status: "SHIPPED",
            paymentStatus: "PAID",
            total: 150.0,
            trackingCode: "TRK-1042BR",
            carrier: "Logística Própria"
        },
        create: {
            id: "PED-1042",
            tenantId,
            userId: user.id,
            status: "SHIPPED",
            paymentStatus: "PAID",
            total: 150.0,
            trackingCode: "TRK-1042BR",
            carrier: "Logística Própria"
        }
    });
    console.log("📦 Pedido de teste pronto:", order.id);

    // 5. Cria ou atualiza a Entrega (Delivery) vinculando o pedido ao entregador
    const delivery = await prisma.delivery.upsert({
        where: { orderNumber: "PED-1042" },
        update: {
            status: "IN_TRANSIT",
            driverId: driver.id,
            tenantId
        },
        create: {
            orderNumber: "PED-1042",
            tenantId,
            driverId: driver.id,
            customerPhone: "+5521999999999",
            status: "IN_TRANSIT"
        }
    });
    console.log("🚚 Rastreio de entrega pronto:", delivery.id);

    console.log("\n✅ Base de teste inicializada com sucesso!");
}

main()
    .catch((err) => {
        console.error("❌ Erro ao executar o seed:", err);
    })
    .finally(() => prisma.$disconnect());
