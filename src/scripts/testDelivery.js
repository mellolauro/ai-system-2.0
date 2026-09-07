import { getDeliveryStatusTool } from './deliveryTools.js';

async function runTest() {
  console.log('--- Testando Busca de Entrega ---');
  const result = await getDeliveryStatusTool({ orderNumber: 'PED-1042' });
  console.log(JSON.stringify(result, null, 2));
}

runTest();
