# ReforçosEscolares — Backend

API REST NestJS para a plataforma SaaS multi-tenant de gestão de aulas de reforço.

**Porta:** 3000 | **Swagger:** http://localhost:3000/docs (apenas em dev)

## Setup

```bash
# Na raiz do monorepo
docker compose up -d        # sobe PostgreSQL + Redis

# Nesta pasta
pnpm dev                    # inicia com hot-reload e aplica migrations
```

## Scripts

```bash
pnpm dev              # desenvolvimento com hot-reload
pnpm build            # build de produção
pnpm start:prod       # inicia build de produção

pnpm migration:run    # rodar migrations pendentes
pnpm migration:revert # reverter última migration

pnpm test             # testes unitários
pnpm test:e2e         # testes E2E (requer docker compose up -d)
pnpm test:cov         # cobertura
pnpm lint             # ESLint
```

## Módulos

| Spec | Módulo | Pasta | Endpoints principais |
|---|---|---|---|
| 1 | Tenancy + Auth | `src/modules/auth/`, `src/modules/tenants/` | `POST /auth/login`, `POST /auth/signup`, `GET /auth/me` |
| 2 | Disciplinas e Turmas | `src/modules/subjects/`, `src/modules/groups/` | `GET/POST /subjects`, `GET/POST /groups` |
| 3 | Agendamento + Salas | `src/modules/scheduling/`, `src/modules/rooms/`, `src/common/google-calendar/` | `GET/POST /sessions` (gera `meetLink` via Google Meet automaticamente para sessões online, se configurado), `GET/POST /rooms`, `POST /rooms/:id/assignments`, `DELETE /rooms/:id/assignments/:aid`, `POST /rooms/:id/checkin`, `GET /rooms/checkins/active`, `PATCH /rooms/checkins/:id/reassign`, `GET /kiosk/rooms`, `GET /kiosk/students` |
| 4 | Presença e Pedagógico | `src/modules/attendance/`, `src/modules/tasks/`, `src/modules/progress/` | `POST /attendances`, `GET/POST /tasks`, `GET /progress/:studentId` |
| 5 | Comunicação | `src/modules/communication/` | `GET/POST /messages`, `GET /notifications`, `POST /announcements` |
| 6 | Financeiro | `src/modules/finance/` | `GET/POST /plans`, `POST /student-plans`, `GET/POST /payments` |
| 7 | Relatórios | `src/modules/reports/` | `GET /reports/admin/kpis`, `GET /reports/student/:id` |
| 8 | Super Admin | `src/modules/super-admin/` | `GET /super-admin/tenants`, `POST /super-admin/auth/login` |
| 9 | IA Pedagógica | `src/modules/ai/` | `GET /ai/panorama/:studentId`, `GET /ai/groups-by-topic` |

## Migrations

Ficam em `src/database/migrations/`. Rodam automaticamente ao iniciar (`migrationsRun: true`).

Nomenclatura: `NomeDaClasse<timestamp_js>.ts` — o sufixo numérico é obrigatório para o TypeORM aceitar.

## Arquitetura — Guards em cascata

```
JwtAuthGuard → TenantGuard → RolesGuard → ThrottlerGuard
```

- `@Public()` — exclui da autenticação JWT
- `@Roles('tenant_admin')` — exige role específico
- `TenantGuard` — resolve tenant pelo subdomínio (web) ou header `X-Tenant-Slug` (mobile)
- `TenantInterceptor` — injeta `tenant_id` automaticamente em todas as queries

## Variáveis de ambiente

Definidas no `.env` na raiz do monorepo. Ver tabela completa no README raiz.
