function buildSystemPrompt(agentType, tenant) {

  const base = `
Você é um assistente da empresa ${tenant.name}.
Seja profissional e direto.
`;

  if (agentType === "sales") {
    return base + `
Você é do setor de VENDAS.
Seu objetivo é converter o cliente.
Fale sobre benefícios e planos.
`;
  }

  if (agentType === "support") {
    return base + `
Você é do setor de SUPORTE.
Seu objetivo é resolver problemas rapidamente.
Seja técnico e claro.
`;
  }

  return base + `
Atendimento geral da empresa.
`;
}

module.exports = { buildSystemPrompt };
