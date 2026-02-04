# 🚀 Guia de Migração - Fase 2

## ✅ O Que Já Foi Feito

### 1. Schema Prisma Atualizado
- ✅ Mudou de SQLite para PostgreSQL
- ✅ Adicionados 7 modelos: User, Campaign, Journey, Run, Contact, MessageLog, Template
- ✅ Relacionamentos e índices configurados

### 2. Repositories Criados
- ✅ `src/repositories/journeyRepository.js`
- ✅ `src/repositories/runRepository.js`
- ✅ `src/repositories/userRepository.js`

### 3. Rotas Atualizadas
- ✅ `src/routes/journeysRoutes.js` - Usa journeyRepository
- ✅ `src/routes/runsRoutes.js` - Usa runRepository
- ✅ `src/routes/inbound.js` - Usa runRepository

### 4. Scripts de Migração
- ✅ `scripts/backupJsonData.js` - Backup dos JSON files
- ✅ `scripts/migrateJsonToDb.js` - Migra dados JSON → PostgreSQL

### 5. Configuração
- ✅ `.env` atualizado com DATABASE_URL para PostgreSQL
- ✅ Variáveis de ambiente adicionadas (JWT_SECRET, etc)

---

## 🔧 Próximos Passos (Para Você Executar)

### Passo 1: Iniciar PostgreSQL

**Opção A - Docker (Recomendado):**

```bash
# 1. Iniciar Docker Desktop
# Abra o Docker Desktop manualmente

# 2. Iniciar container PostgreSQL
docker run -d \
  --name whatsapp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=whatsapp_campaigns \
  -p 5432:5432 \
  postgres:14-alpine

# 3. Verificar se está rodando
docker ps | grep whatsapp-postgres
```

**Opção B - PostgreSQL Local:**

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Criar database
createdb whatsapp_campaigns
```

### Passo 2: Gerar Migrations do Prisma

```bash
cd backend

# Gerar Prisma Client
npx prisma generate

# Criar migrations
npx prisma migrate dev --name init_postgresql_schema

# Verificar migrations
ls -la prisma/migrations
```

### Passo 3: Fazer Backup dos Dados JSON

```bash
cd backend

# Executar script de backup
node scripts/backupJsonData.js

# Verificar backup criado
ls -la backups/
```

### Passo 4: Migrar Dados JSON → PostgreSQL

```bash
cd backend

# Executar migração
node scripts/migrateJsonToDb.js

# Verificar dados migrados
npx prisma studio
# Abra http://localhost:5555 para visualizar os dados
```

### Passo 5: Testar a Aplicação

```bash
cd backend

# Iniciar servidor
npm start

# Em outro terminal, testar endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/journeys
curl http://localhost:3001/api/runs
```

---

## 📊 Verificar Migração

Após a migração, você pode verificar os dados:

```bash
cd backend

# Abrir Prisma Studio
npx prisma studio

# Ou via psql
docker exec -it whatsapp-postgres psql -U postgres -d whatsapp_campaigns

# Comandos SQL úteis:
\dt                           -- Listar tabelas
SELECT COUNT(*) FROM "Journey";
SELECT COUNT(*) FROM "Run";
SELECT COUNT(*) FROM "Contact";
SELECT * FROM "Journey" LIMIT 5;
```

---

## ⚠️ Problemas Comuns

### PostgreSQL não conecta

```bash
# Verificar se container está rodando
docker ps -a | grep whatsapp-postgres

# Ver logs
docker logs whatsapp-postgres

# Reiniciar container
docker restart whatsapp-postgres
```

### Erro: "relation does not exist"

```bash
# Rodar migrations novamente
cd backend
npx prisma migrate reset --force
npx prisma migrate dev
```

### Dados não migraram

```bash
# Verificar se arquivos JSON existem
ls -la src/data/*.json

# Ver logs do script
node scripts/migrateJsonToDb.js 2>&1 | tee migration.log
```

---

## 🔄 Rollback (Se Algo Der Errado)

```bash
# 1. Parar servidor
# Ctrl+C

# 2. Restaurar .env
# Descomentar: DATABASE_URL="file:./dev.db"
# Comentar: DATABASE_URL="postgresql://..."

# 3. Restaurar código (se necessário)
git checkout backend/src/routes/journeysRoutes.js
git checkout backend/src/routes/runsRoutes.js
git checkout backend/src/routes/inbound.js

# 4. Reiniciar
npm start
```

---

## ✅ Checklist de Verificação

Após completar todos os passos:

- [ ] PostgreSQL está rodando (Docker ou local)
- [ ] Migrations foram aplicadas (`npx prisma migrate dev`)
- [ ] Backup JSON foi criado (`backups/backup_*`)
- [ ] Dados foram migrados (`node scripts/migrateJsonToDb.js`)
- [ ] Servidor inicia sem erros (`npm start`)
- [ ] Endpoint `/health` responde
- [ ] Endpoint `/api/journeys` lista journeys do DB
- [ ] Endpoint `/api/runs` lista runs do DB
- [ ] Prisma Studio mostra dados (`npx prisma studio`)

---

## 🎯 Próxima Fase

Quando a Fase 2 estiver completa, vamos para:

**Fase 3: BullMQ & Performance**
- Reescrever flowWorker para usar BullMQ
- Paralelizar envio de mensagens
- Implementar message worker
- Melhorar throughput 10x

**Fase 4: Testes**
- Adicionar Jest
- Testes unitários (repositories)
- Testes de integração (API)
- Coverage >70%

**Fase 5: Documentação**
- README completo
- API docs
- Docker Compose
- Guia de deployment

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs: `logs/error.log`
2. Verifique Docker: `docker logs whatsapp-postgres`
3. Verifique conexão: `npx prisma db push --preview-feature`

Bora! 🚀
