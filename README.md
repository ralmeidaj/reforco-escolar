# ReforçosEscolares

Plataforma SaaS **multi-tenant** para gestão de aulas de reforço. Professores, alunos, responsáveis e administradores em um só lugar.

**Stack:** NestJS · Next.js 15 App Router · Expo (React Native) · PostgreSQL + TypeORM · Redis · BullMQ · Resend · Cloudflare R2

---

## Estrutura

```
apps/
  backend/    NestJS REST API (porta 3000)
  frontend/   Next.js 15 web app (porta 3001)
  mobile/     Expo (React Native) — iOS e Android
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker Desktop

## Setup rápido

```bash
# 1. Dependências
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# 3. Infraestrutura (PostgreSQL + Redis)
docker compose up -d

# 4. Backend (aplica migrations automaticamente)
cd apps/backend && pnpm dev   # http://localhost:3000

# 5. Frontend
cd apps/frontend && pnpm dev  # http://localhost:3001

# 6. Mobile (opcional)
cd apps/mobile && npx expo start
```

## Variáveis obrigatórias (`.env` na raiz)

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Secret JWT — mesmo valor no backend e `apps/frontend/.env.local` |
| `DATABASE_URL` | URL do PostgreSQL |
| `REDIS_URL` | URL do Redis (Upstash ou local) |
| `RESEND_API_KEY` | Chave Resend para e-mails transacionais |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Nome do bucket R2 |

Variáveis opcionais (modo stub sem chave): `ASAAS_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `OPENAI_API_KEY`.

## Comandos úteis

```bash
# Migrations
cd apps/backend
pnpm migration:run      # rodar pendentes
pnpm migration:revert   # reverter última

# Testes
cd apps/backend
pnpm test               # unitários
pnpm test:e2e           # E2E (requer docker compose up -d)
pnpm test:cov           # cobertura

# Build e lint
pnpm build
pnpm lint

# Mobile — gerar APK/IPA via EAS Build
cd apps/mobile
eas build --platform android --profile preview   # APK instalável direto (distribution: internal)
eas build --platform ios --profile preview
```

⚠️ Antes do primeiro build, registrar `EXPO_PUBLIC_API_URL` no EAS (o `apps/mobile/.env` local é gitignored e não é enviado ao build na nuvem):
```bash
eas env:create --scope project --name EXPO_PUBLIC_API_URL --value https://sua-api.com --environment preview --visibility plaintext
```

## Swagger

Disponível em `http://localhost:3000/docs` com o backend rodando em modo dev.

## Roles do sistema

| Role | Descrição |
|---|---|
| `super_admin` | Gerencia todos os tenants da plataforma |
| `tenant_admin` | Diretor ou dono da escola de reforço |
| `teacher` | Registra presença, notas e tarefas |
| `student` | Visualiza calendário, tarefas e progresso |
| `guardian` | Acompanha frequência, desempenho e faturas |

## Multi-tenancy

Row-level tenancy com `tenant_id` em todas as tabelas. O tenant é identificado pelo subdomínio (`escola.app.com`) na web e pelo header `X-Tenant-Slug` no mobile.

## Módulos implementados

| Spec | Módulo | Status |
|---|---|---|
| 1 | Tenancy + Auth | ✅ |
| 2 | Disciplinas, Turmas e Vínculos | ✅ |
| 3 | Agendamento de Aulas + Salas | ✅ |
| 4 | Presença e Acompanhamento Pedagógico | ✅ |
| 5 | Comunicação (chat, notificações, avisos) | ✅ |
| 6 | Financeiro (pacotes, pagamentos) | ✅ |
| 7 | Relatórios e Dashboards | ✅ |
| 8 | Super Admin — Plataforma | ✅ |
| 9 | IA Pedagógica | ✅ |

## Migrations

```
0001_tenants_and_auth
0002_subjects_groups
0003_scheduling_rooms
0004_attendance_progress
0005_communication
0006_finance
0007_reports
0008_super_admin
0009_ai_pedagogica
0010_invites
0011_room_checkins
0012_room_teacher_subject
0013_session_student_nullable
0014_room_assignments
0015_room_schedules
```

## Hospedagem recomendada

Hetzner VPS CAX11 (€3/mês) com Docker Compose + Nginx + Certbot (SSL wildcard `*.app.com`).
