# BroadCamp - Plataforma de Campanhas WhatsApp & SMS

Sistema completo de gerenciamento e disparo de mensagens via WhatsApp Business API e SMS usando Twilio.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API](#api)
- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Deploy](#deploy)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

BroadCamp é uma plataforma white-label para envio de mensagens em massa via WhatsApp e SMS, construída especialmente para parceiros Twilio. Permite que cada cliente configure suas próprias credenciais e gerencie campanhas de forma independente.

### Características Principais

- ✅ **Multi-tenant**: Cada cliente com suas credenciais Twilio
- ✅ **WhatsApp Business API**: Envio via Content API da Twilio
- ✅ **SMS Internacional**: Suporte E.164 para qualquer país
- ✅ **Templates**: Criação, validação e gerenciamento de templates
- ✅ **IA Integrada**: Geração automática de copy com OpenAI
- ✅ **Analytics**: Dashboards e relatórios detalhados
- ✅ **Autenticação**: Sistema JWT completo com controle de acesso
- ✅ **Interface Moderna**: Design inspirado em Twilio Docs

## ⚡ Funcionalidades

### Gestão de Campanhas
- Disparo em massa para WhatsApp e SMS
- Upload de CSV com validação E.164
- Substituição de variáveis dinâmicas
- Tracking de status (enviado, entregue, falha)

### Templates
- Criação com preview em tempo real
- Validação de compliance (Meta/WhatsApp)
- Detecção automática de variáveis
- Sugestões de reescrita com IA

### Analytics
- Dashboard com métricas principais
- Gráficos de performance
- Comparação por período
- Top campanhas por performance

### Administração
- Gerenciamento de usuários (admin/user)
- Configuração de credenciais Twilio
- Configuração de API Keys (OpenAI)
- Controle de acesso por role

## 🛠 Tecnologias

### Frontend
- **React 18** - UI Library
- **Material-UI v5** - Design System
- **React Router v7** - Navegação
- **Notistack** - Toast notifications
- **PapaParse** - Parsing CSV

### Backend
- **Node.js 20** - Runtime
- **Express** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e filas
- **BullMQ** - Job queue
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas

### Infraestrutura
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Nginx** - Reverse proxy
- **Winston** - Logging

### Integrações
- **Twilio** - WhatsApp & SMS
- **OpenAI** - Geração de copy

## 📦 Requisitos

- Docker 20+ e Docker Compose
- Conta Twilio ativa
- (Opcional) OpenAI API Key

## 🚀 Instalação

### 1. Clone o repositório

\`\`\`bash
git clone <repo-url>
cd initucastt_old
\`\`\`

### 2. Configure variáveis de ambiente

\`\`\`bash
cp backend/.env.example backend/.env
\`\`\`

Edite \`backend/.env\` com suas configurações iniciais (opcional, pode configurar via UI depois):

\`\`\`env
# Database
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/whatsapp_campaigns"

# Redis
REDIS_URL="redis://redis:6379"

# JWT
JWT_SECRET="sua-chave-secreta-muito-segura-aqui"

# Twilio (opcional - configure via UI)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_SMS_FROM=

# OpenAI (opcional)
OPENAI_API_KEY=

# Frontend
FRONTEND_URL=http://localhost:3000
\`\`\`

### 3. Inicie os containers

\`\`\`bash
docker-compose up -d
\`\`\`

Isso irá:
- Criar banco PostgreSQL
- Criar Redis para filas
- Rodar migrations do Prisma
- Iniciar backend API (porta 3001)
- Iniciar 2 workers (BullMQ)
- Build e servir frontend (porta 3000)
- Criar usuário admin padrão

### 4. Acesse a aplicação

Abra [http://localhost:3000](http://localhost:3000)

**Credenciais padrão:**
- Email: \`admin@broadcamp.com\`
- Senha: \`admin123\`

**⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

## ⚙️ Configuração

### 1. Login Inicial

Acesse a aplicação e faça login com as credenciais padrão.

### 2. Configure Credenciais Twilio

Vá em **Configurações** no menu lateral e preencha:

- **Account SID**: Encontre em console.twilio.com
- **Auth Token**: Encontre em console.twilio.com
- **WhatsApp Sender**: Número aprovado para WhatsApp (ex: \`+5541999999999\`)
- **SMS Sender**: Número Twilio para SMS (ex: \`+14253294891\`)
- **OpenAI API Key** (opcional): Para geração de copy

Clique em **Salvar Configurações**.

✅ **As configurações são salvas imediatamente e aplicadas em tempo real!**

### 3. Criar Outros Usuários (Opcional)

Vá em **Usuários** > **Novo Usuário** e crie usuários com role \`user\` ou \`admin\`.

## 📱 Uso

### Disparar Campanha

1. Vá em **Disparo**
2. Escolha o canal (WhatsApp ou SMS)
3. Selecione um template aprovado
4. Faça upload de CSV com contatos
5. Configure variáveis (se houver)
6. Clique em **Iniciar Disparo**

### Criar Template

1. Vá em **Templates**
2. Preencha nome, idioma e categoria
3. Escreva a mensagem (use \`{{1}}\`, \`{{2}}\` para variáveis)
4. **(Opcional)** Use IA para gerar copy automaticamente
5. Verifique compliance
6. Clique em **Criar Template**
7. Aguarde aprovação da Meta (via Twilio Console)

### Ver Analytics

1. Vá em **Analytics**
2. Selecione período (7 dias, 30 dias, 12 meses)
3. Filtre por canal (todos, WhatsApp, SMS)
4. Veja gráficos e top campanhas

## 📡 API

### Autenticação

Todas as rotas (exceto \`/api/auth/*\`) requerem header:

\`\`\`
Authorization: Bearer <jwt-token>
\`\`\`

### Endpoints Principais

**Auth**
\`\`\`
POST   /api/auth/login       - Login
GET    /api/auth/me          - Usuário atual
POST   /api/auth/register    - Registrar (requer admin)
\`\`\`

**Users** (admin only)
\`\`\`
GET    /api/users            - Listar usuários
POST   /api/users            - Criar usuário
PATCH  /api/users/:id        - Atualizar usuário
DELETE /api/users/:id        - Deletar usuário
\`\`\`

**Templates**
\`\`\`
GET    /api/templates        - Listar templates
POST   /api/templates        - Criar template
GET    /api/templates/:sid   - Buscar por SID
\`\`\`

**Campanhas**
\`\`\`
POST   /api/send/whatsapp    - Enviar WhatsApp
POST   /api/send/sms         - Enviar SMS
POST   /api/campaign         - Disparar campanha
GET    /api/history          - Histórico de mensagens
\`\`\`

**Settings**
\`\`\`
GET    /api/settings         - Buscar configurações
POST   /api/settings         - Salvar configurações
\`\`\`

## 🏗 Arquitetura

### Estrutura de Pastas

\`\`\`
initucastt_old/
├── backend/
│   ├── src/
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Lógica de negócio
│   │   ├── workers/         # BullMQ workers
│   │   ├── middleware/      # Auth, rate limit, etc
│   │   ├── utils/           # Logger, helpers
│   │   └── index.js         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Modelo de dados
│   ├── scripts/             # Utilitários
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Páginas React
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── contexts/        # Context API (Auth)
│   │   ├── theme/           # Material-UI theme
│   │   └── App.js
│   ├── public/
│   ├── nginx.conf           # Nginx config
│   └── Dockerfile
├── docker-compose.yml
└── README.md
\`\`\`

### Fluxo de Dados

\`\`\`
User → Nginx (3000) → React SPA
                    ↓
              API (3001) → PostgreSQL
                    ↓         ↑
                 BullMQ ← Redis
                    ↓
            Workers (message, flow)
                    ↓
              Twilio API
\`\`\`

### Workers

**Message Worker** (Concurrency: 10)
- Processa filas de mensagens
- Rate limit: 50 msg/s
- Retry: 3 tentativas
- Backoff exponencial

**Flow Worker** (Concurrency: 2)
- Processa jornadas
- Avança contatos entre nós
- Gerencia delays e waits

## 🔒 Segurança

### Implementado

✅ **Autenticação JWT** - Tokens com expiração  
✅ **Bcrypt** - Hash de senhas com salt  
✅ **Helmet** - Headers de segurança HTTP  
✅ **CORS** - Configurado para frontend  
✅ **Rate Limiting** - 100 req/15min (API), 100 req/min (webhooks)  
✅ **Input Validation** - Joi schemas  
✅ **SQL Injection** - Prisma (ORM)  
✅ **Webhook Validation** - Assinatura Twilio  
✅ **Logs Estruturados** - Winston (erros, acessos)  

### Boas Práticas

- Nunca commitar \`.env\` (já no \`.gitignore\`)
- Tokens mascarados na UI
- Senhas nunca retornadas pela API
- Auth token em localStorage (HttpOnly não funciona com SPA)

## 🚢 Deploy

### Produção (Docker)

1. Configure variáveis de ambiente de produção
2. Use PostgreSQL e Redis externos (managed)
3. Configure HTTPS (Let's Encrypt + Nginx)
4. Use \`NODE_ENV=production\`

\`\`\`bash
# Build imagens
docker-compose build

# Subir em produção
docker-compose up -d
\`\`\`

### Variáveis de Ambiente de Produção

\`\`\`env
NODE_ENV=production
DATABASE_URL=<postgres-managed-url>
REDIS_URL=<redis-managed-url>
JWT_SECRET=<chave-forte-gerada>
FRONTEND_URL=https://seudominio.com
\`\`\`

### Health Check

\`\`\`bash
curl http://localhost:3001/health
\`\`\`

Resposta esperada:
\`\`\`json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
\`\`\`

## 🐛 Troubleshooting

### Container não sobe

\`\`\`bash
# Ver logs
docker-compose logs backend
docker-compose logs frontend

# Reconstruir
docker-compose down
docker-compose build --no-cache
docker-compose up -d
\`\`\`

### Mensagens não enviando

1. Verifique credenciais em **Configurações**
2. Verifique se o número WhatsApp está ATIVO (Twilio Console)
3. Verifique se template está APROVADO pela Meta
4. Veja logs: \`docker-compose logs backend\`

### Webhook não funcionando

1. Configure webhook URL na Twilio Console:
   \`https://seudominio.com/inbound/webhook\`
2. Método: POST
3. Valide assinatura Twilio

### Erro de autenticação

1. Token expirado - Faça login novamente
2. Limpe localStorage: \`localStorage.clear()\`
3. Verifique JWT_SECRET no backend

### Database connection error

\`\`\`bash
# Verificar se Postgres está rodando
docker-compose ps postgres

# Rodar migrations
docker exec initucastt-backend npx prisma migrate deploy
\`\`\`

## 📝 Scripts Úteis

\`\`\`bash
# Ver logs em tempo real
docker-compose logs -f backend

# Acessar banco de dados
docker exec -it initucastt-postgres psql -U postgres -d whatsapp_campaigns

# Criar novo usuário admin
docker exec initucastt-backend node scripts/createAdminUser.js

# Backup do banco
docker exec initucastt-postgres pg_dump -U postgres whatsapp_campaigns > backup.sql

# Restore do banco
cat backup.sql | docker exec -i initucastt-postgres psql -U postgres -d whatsapp_campaigns
\`\`\`

## 📄 Licença

MIT License

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato com o time de desenvolvimento.

---

**Desenvolvido com ❤️ para parceiros Twilio**
