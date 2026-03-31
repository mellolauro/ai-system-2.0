#!/bin/bash

# 1. Pega o token atual direto do binário do OpenClaw
OFFICIAL_TOKEN=$(openclaw config get auth.token)

if [ -z "$OFFICIAL_TOKEN" ]; then
    echo "❌ Erro: Não foi possível recuperar o token do OpenClaw."
    exit 1
fi

echo "🔑 Token oficial encontrado: ${OFFICIAL_TOKEN:0:6}..."

# 2. Atualiza o arquivo .env (preservando outras variáveis)
if grep -q "OPENCLAW_TOKEN=" .env; then
    # Se já existe, substitui
    sed -i "s/^OPENCLAW_TOKEN=.*/OPENCLAW_TOKEN=$OFFICIAL_TOKEN/" .env
else
    # Se não existe, adiciona ao final
    echo "OPENCLAW_TOKEN=$OFFICIAL_TOKEN" >> .env
fi

echo "✅ Arquivo .env atualizado com o token correto!"
