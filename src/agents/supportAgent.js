const { ask } = require("../services/openclawClient");

async function supportAgent({ text }) {

  return await ask({
    text: `
Você é suporte ao cliente.

Ajude com problemas como:
- atraso
- pedido
- entrega

Mensagem:
${text}
`
  });
}

module.exports = { supportAgent };
