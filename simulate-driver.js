/**
 * Script de Simulação GPS do Entregador em Movimento
 * Uso: node simulate-driver.js
 */

const DRIVER_PHONE = "+5521999999999";
const TENANT_ID = "cmtr96kjb000085vfrvtxmqwj"; // Substitua pelo ID do seu tenant se necessário
const SERVER_URL = "http://localhost:3000/api/drivers/location";
const INTERVAL_MS = 3000; // Envia atualização a cada 3 segundos

// Ponto inicial da simulação (Ex: Centro de Nova Iguaçu / RJ)
let currentLat = -22.7561;
let currentLng = -43.4602;

// Deslocamento por passo (~10 a 20 metros)
const LAT_STEP = 0.00015;
const LNG_STEP = 0.00020;

let stepCount = 0;

async function sendLocationUpdate() {
  stepCount++;

  // Simula pequenas variações no deslocamento para parecer um GPS real
  currentLat += LAT_STEP + (Math.random() - 0.5) * 0.00005;
  currentLng += LNG_STEP + (Math.random() - 0.5) * 0.00005;

  const payload = {
    driverPhone: DRIVER_PHONE,
    latitude: parseFloat(currentLat.toFixed(6)),
    longitude: parseFloat(currentLng.toFixed(6))
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": TENANT_ID
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(
        `[Passo ${stepCount}] ✓ Posição enviada: Lat: ${payload.latitude}, Lng: ${payload.longitude} | Resposta: ${data.message}`
      );
    } else {
      console.error(
        `[Passo ${stepCount}] ❌ Falha na resposta (${response.status}):`,
        data
      );
    }
  } catch (error) {
    console.error(`[Passo ${stepCount}] ❌ Erro de conexão com a API:`, error.message);
  }
}

console.log("==================================================");
console.log("🚀 Iniciando Simulação de GPS do Entregador");
console.log(`📱 Telefone: ${DRIVER_PHONE}`);
console.log(`🌐 Alvo: ${SERVER_URL}`);
console.log(`⏱️  Intervalo: ${INTERVAL_MS / 1000}s`);
console.log("==================================================\n");

// Executa o primeiro envio e agenda os próximos em loop
sendLocationUpdate();
setInterval(sendLocationUpdate, INTERVAL_MS);
