/**
 * Script para cadastrar um entregador de teste no banco
 * Uso: node seed-driver.js
 */

const prisma = require("./src/prisma");

async function seedDriver() {
  try {
    // Busca ou cria um Tenant padrão se necessário
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "Empresa de Teste",
          slug: "empresa-teste"
        }
      });
      console.log("✓ Tenant de teste criado:", tenant.id);
    }

    // Cria ou atualiza o entregador com o telefone da simulação
    const driver = await prisma.driver.upsert({
      where: { phone: "+5521999999999" },
      update: {
        name: "Carlos Entregador",
        vehicle: "Moto Honda CG 160",
        plate: "ABC-1234",
        tenantId: tenant.id
      },
      create: {
        name: "Carlos Entregador",
        phone: "+5521999999999",
        vehicle: "Moto Honda CG 160",
        plate: "ABC-1234",
        tenantId: tenant.id
      }
    });

    console.log("==========================================");
    console.log("✓ Entregador cadastrado com sucesso!");
    console.log(`👤 Nome: ${driver.name}`);
    console.log(`📱 Telefone: ${driver.phone}`);
    console.log(`🔑 Driver ID: ${driver.id}`);
    console.log(`🏢 Tenant ID: ${driver.tenantId}`);
    console.log("==========================================");
  } catch (error) {
    console.error("❌ Erro ao cadastrar entregador:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDriver();
