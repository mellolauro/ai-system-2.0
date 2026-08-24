# ARCHITECTURE.md — Specification & Framework Manual

| Document Metadata | Value |
| :--- | :--- |
| **Status** | PROPOSED (RFC 002) |
| **Version** | 2.0.0-DRAFT |
| **Target System** | OpenClaw Engine / Framework Core |
| **Architecture** | Framework / Clean Architecture / Event-Driven / Multi-Tenant |

---

## 1. Visão Geral

Este documento especifica a arquitetura técnica do **OpenClaw SaaS Engine**. A plataforma oferece uma infraestrutura genérica para orquestração de múltiplos agentes autônomos orientados a tarefas em um ambiente seguro, multi-tenant e extensível por plugins e adaptadores de canais.

---

## 2. Filosofia da Arquitetura

> **O OpenClaw SaaS Engine não foi concebido como uma aplicação. Foi concebido como um framework para construção de aplicações inteligentes orientadas por agentes.**

Todo o Kernel deve permanecer rigorosamente independente de tecnologias e protocolos externos como:
* Telegram / WhatsApp / Discord
* Express / Fastify / HTTP / Webhooks
* Prisma / TypeORM / Knex
* PostgreSQL / Redis / MongoDB
* OpenAI / OpenClaw / Anthropic / Google Gemini

O Kernel conhece apenas **interfaces, abstrações e eventos**. Toda tecnologia de comunicação, armazenamento ou inteligência externa é tratada estritamente como um **adaptador** (Clean / Hexagonal Architecture). Esta filosofia assegura a longevidade do projeto e permite substituir infraestruturas e modelos sem alterar o núcleo do sistema.

---

## 3. Princípios do Kernel

> **Regra Inviolável de Isolamento:** Um componente do Kernel NUNCA deve importar ou conhecer tecnologias concretas de infraestrutura.

Um componente do Kernel:
* **NÃO conhece:** banco de dados, Prisma, Telegram, WhatsApp, Express, HTTP, REST, OpenAI, OpenClaw.
* **Conhece APENAS:** Interfaces, Contextos (DTOs), Eventos, Entidades de Domínio.

Esta disciplina previne acoplamento indevido (ex: incluir dependências de frameworks Web ou ORMs no orquestrador do sistema) e garante testabilidade unitária com zero mocks de rede.

---

## 4. Objetivos

* **Framework para Agentes Autônomos:** Prover primitivas de alta performance para execução de IA.
* **Multi-Tenancy Nativo:** Isolamento estrito de sessões, dados e limites de uso por tenant.
* **Agnostocidade Total de Provider:** Suporte transparente a múltiplos provedores via fábrica/mecanismo de execução.
* **Arquitetura Desacoplada:** Separação limpa entre descoberta, decisão, registro e execução.

---

## 5. Core Components Manual (Componentes do Kernel)

### 5.1 Agent
Representa um agente inteligente autônomo e isolado.
* **Responsabilidades:** Carregar o próprio prompt (alocado em `agents/<agent_name>/prompt.md`), carregar configurações específicas, mapear ferramentas autorizadas e executar seu ciclo.
* **Dependências:** Nenhuma (independente de framework e infraestrutura).

### 5.2 AgentRegistry
Catálogo central responsável pela descoberta e registro de agentes do sistema.
* **Responsabilidades:** Registrar novos agentes, localizar agentes por ID/Key, listar agentes disponíveis por tenant e remover instâncias de runtime.
* **Dependências:** Interface do Agente.

### 5.3 SessionManager
Gerenciador do ciclo de vida das sessões ativas no sistema.
* **Responsabilidades:** Manter o estado da sessão (chave unificada `tenant_id:channel_id:user_id`), gerenciar expiração (TTL) e controlar o estado do agente ativo.
* **Dependências:** Repositório/Cache de Sessão (Abstração).

### 5.4 ContextBuilder
Mecanismo responsável por construir o contexto consolidado e imutável para a execução da chamada do agente.
* **Responsabilidades:** Agrupar o contexto completo (Contexto + Prompt do Agente + Ferramentas Autorizadas + Memória Recorrente).
* **Entradas:** Sessão, Tenant, Memória, Usuário.
* **Saída:** `ExecutionContext` (DTO imutável pronto para o agente/provider).

### 5.5 MemoryManager
Único componente autorizado a manipular e persistir a memória das conversas e interações.
* **Responsabilidades:** Persistir interações de curto prazo (cache) e longo prazo (vetorial/RAG) e recuperar trechos relevantes com base no contexto.
* **Dependências:** Interface de repositório de memória.

### 5.6 ToolRegistry
Catálogo responsável pela descoberta e ciclo de vida de registro das ferramentas (tools) disponíveis no sistema.
* **Responsabilidades:** Descobrir ferramentas, registrar ferramentas validadas, carregar instâncias de plugins e listar assinaturas públicas das ferramentas.

### 5.7 ToolEngine
Motor de execução de ferramentas invocadas pelos agentes via Function Calling.
* **Responsabilidades:** Validar parâmetros contra o schema da ferramenta, executar a função com segurança, capturar exceções e retornar o resultado formatado.

### 5.8 ProviderEngine (ou ProviderFactory / OpenClawEngine)
Motor responsável por traduzir o `ExecutionContext` para o formato exigido pelo modelo de linguagem e chamar o provedor concreto.
* **Mapeamento:** `providers/ OpenClawProvider, OpenAIProvider, GeminiProvider, ClaudeProvider, OllamaProvider`.
* **Responsabilidades:** Gerenciar comunicação com os provedores, realizar retry/fallback de requisições e normalizar a resposta bruta no contrato padrão do Kernel.

### 5.9 Orchestrator
O maestro do Kernel. Responsável por coordenar todo o ciclo de decisão e fluxo de dados do evento de entrada até a resposta final.
* **Responsabilidades:** Coordenar a captura de sessão, acionar o ContextBuilder, consultar o AgentRegistry, tomar a decisão de execução, solicitar ações ao ToolEngine se necessário, invocar o ProviderEngine e solicitar persistência ao MemoryManager.

---

## 6. Arquitetura e Camadas
[Channels / Ingress] (Telegram, WhatsApp, REST, Discord)
│
▼
[Controllers] (MessageController, WebhookController)
│
▼
┌──────────────────────────────────────────────────────────┐
│                   KERNEL / CORE FRAMEWORK                │
│                                                          │
│  Orchestrator                                            │
│   ├── SessionManager                                     │
│   ├── ContextBuilder                                     │
│   │    ├── AgentRegistry (retorna Agent + prompt.md)     │
│   │    ├── ToolRegistry                                  │
│   │    └── MemoryManager                                 │
│   ├── ToolEngine (executa ferramentas chamadas)          │
│   └── ProviderEngine (OpenClaw / OpenAI / Gemini)        │
└──────────────────────────────────────────────────────────┘
│
▼
[Repositories & Adaptadores Concretos] (Prisma, Redis, VectorDB, HTTP Clients)


---

## 7. Estrutura de Diretórios dos Agentes

Os agentes contêm seus próprios prompts e configurações em diretórios dedicados dentro do projeto:

agents/
├── sales/
│   ├── prompt.md
│   ├── config.json
│   └── index.ts
├── support/
│   ├── prompt.md
│   ├── config.json
│   └── index.ts


---

## 8. Fluxos de Dados (Ciclo Completo)

O fluxo de execução unificado orquestrado pelo `Orchestrator` segue a sequência rigorosa:

Mensagem de Entrada (Recebida via Controller / Channel)
│

Orchestrator obtém/valida a Sessão no SessionManager
│

MemoryManager recupera memórias recentes / semânticas
│

ContextBuilder compila: Contexto = Sessão + Tenant + Memória + Agent (Prompt.md) + Tools
│

Orchestrator aciona o Agente / ProviderEngine
│

Se o modelo solicitar invocação de ação:
└── Orchestrator envia ao ToolEngine ──> Executa ──> Retorna resultado
│

ProviderEngine finaliza a resposta textual/estruturada
│

MemoryManager persiste a nova interação assincronamente
│

Resposta devolvida ao Controller para o Canal correspondente


---

## 9. Roadmap de Arquitetura do Framework

| Fase | Escopo Principal | Metas Arquiteturais |
| :--- | :--- | :--- |
| **Fase 1 (Atual)** | Kernel Refactoring | Implementação da nova separação: Orchestrator, AgentRegistry, ContextBuilder e ToolEngine/Registry. Prompts modularizados em `prompt.md`. |
| **Fase 2** | Multi-Provider & Memory Engine | Implementação do ProviderEngine com fallback dinâmico e integração do MemoryManager com repositórios vetoriais. |
| **Fase 3** | SDK de Plugins & Agentes Dinâmicos | Empacotamento do Kernel em um SD
