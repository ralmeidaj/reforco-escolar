# Reforços Escolares

Plataforma SaaS multi-tenant para gestão de aulas de reforço. Professores, alunos, responsáveis e administradores em um só lugar.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeORM + PostgreSQL |
| Frontend | Next.js 15 App Router + Tailwind v4 |
| Mobile | Expo (React Native) |
| Cache | Redis (Upstash) |
| E-mail | Resend |
| Storage | Cloudflare R2 |
| Push | Expo Push Notification Service |
| Fila | BullMQ |

## Estrutura

```
reforco-escolar/
├── apps/
│   ├── backend/      # API NestJS (porta 3000)
│   ├── frontend/     # Next.js web (porta 3001)
│   └── mobile/       # Expo React Native
├── .env              # Variáveis de ambiente (raiz)
└── docker-compose.yml
```

## Rodando localmente

```bash
# 1. Suba a infraestrutura (PostgreSQL + Redis)
docker compose up -d

# 2. Backend
cd apps/backend && pnpm dev

# 3. Frontend
cd apps/frontend && pnpm dev

# 4. Mobile
cd apps/mobile && npx expo start
```

## Migrations

```bash
cd apps/backend
pnpm migration:run     # rodar pendentes
pnpm migration:revert  # reverter última
```

## Testes

```bash
cd apps/backend
pnpm test          # unitários (Jest)
pnpm test:e2e      # E2E com banco real
pnpm test:cov      # cobertura
```

## Módulos implementados

### Spec 1 — Tenancy + Auth
- Cadastro de tenant (escola) com slug único
- Login / logout / refresh token (JWT 15min + refresh 7d)
- Forgot / reset password via e-mail (Resend)
- Convites por e-mail para professores, alunos e responsáveis
- `TenantGuard` (subdomínio ou header `X-Tenant-Slug` para mobile) + `TenantInterceptor`
- Rate limiting em endpoints sensíveis

### Spec 2 — Disciplinas, Turmas e Vínculos
- CRUD de disciplinas (nome, cor, ícone)
- CRUD de turmas/níveis
- Vínculo professor ↔ disciplina
- Matrícula de aluno em disciplinas
- Vínculo responsável ↔ aluno (N:N)

### Spec 3 — Agendamento de Aulas
- Professor cadastra disponibilidade (recorrente ou avulsa)
- Agendamento pelo admin ou responsável
- Status: `agendada` → `confirmada` → `realizada` / `cancelada`
- CRUD de salas com capacidade e grupo fixo
- Alocação automática de sala (menor ocupação)
- Ocupação em tempo real por sala

### Spec 4 — Presença e Acompanhamento Pedagógico
- Registro de presença: presente / ausente / justificado
- Notas de aula pelo professor
- Tarefas por tipo (padrão / trabalho / eureka / trilha) com prazo
- Marcar tarefa como feita (aluno)
- Diário de estudo (assunto + páginas lidas)
- Upload de atividade (foto ou PDF) → Cloudflare R2 (stub em dev)
- Nível do aluno por disciplina: iniciante → básico → intermediário → avançado

### Spec 5 — Comunicação
- Chat 1:1 responsável ↔ professor
- Notificações in-app com sino no header (polling 30s)
- Avisos gerais do admin por role
- Cron `0 8 * * *`: lembretes de prazo (D-2 e D-1)
- Cron `0 18 * * *`: relatório de faltas do dia para tenant_admin
- Push notifications via Expo Push (token salvo em `/users/push-token`)
- WhatsApp via Evolution API (stub quando env vazio)

### Spec 6 — Financeiro
- CRUD de pacotes de aulas (nome, quantidade, preço)
- Matrícula de aluno em pacote com saldo
- Decremento automático de saldo por sessão realizada
- Alerta de saldo baixo (≤ 2 aulas)
- Registro de pagamento manual (Pix, dinheiro, cartão)
- Integração Asaas/Pix opcional (stub quando env vazio)
- Relatório financeiro mensal por tenant

### Spec 7 — Relatórios e Dashboards
- **Admin:** KPIs em tempo real via materialized view `tenant_kpis` (cron de refresh 1h)
- **Professor:** carga de sessões, alunos, tarefas pendentes
- **Aluno:** frequência, tarefas, registros de estudo, nível por disciplina
- **Responsável:** resumo completo do filho (frequência, tarefas, saldo, nível)
- Todos os dashboards com skeleton loading

### Spec 8 — Super Admin
- Entidade `super_admins` completamente separada dos `users` de tenants
- Auth própria: login com senha + TOTP obrigatório via `otplib` + QR Code
- Token JWT separado (`role: 'super_admin'`), estratégia Passport `super-admin-jwt`
- Controller `GET|PATCH /super-admin/tenants` — listar, ativar, suspender, excluir tenants
- `POST /super-admin/tenants/:id/impersonate` — gera token de impersonation de 1h como `tenant_admin`
- `PATCH /super-admin/tenants/:id/plan` — atribuir plano SaaS ao tenant
- CRUD de planos SaaS (`/super-admin/plans`) — tipo free/pro/enterprise, preço, limites
- `GET /super-admin/audit-logs` — logs de auditoria de todas as ações do super admin
- `@Public()` no controller desbloqueia do `TenantGuard` e `JwtAuthGuard` globais
- Frontend: `/super-admin/login` (com TOTP), `/super-admin/dashboard`, `/super-admin/tenants`, `/super-admin/plans`
- Client Axios separado `sa-api.ts` com token salvo em `sessionStorage`

## Migrations

| # | Nome | Conteúdo |
|---|---|---|
| 0001 | `tenants_and_auth` | `tenants`, `users`, `refresh_tokens`, `invites` |
| 0002 | `subjects_groups` | `subjects`, `groups`, `teacher_subjects`, `student_enrollments`, `guardian_students` |
| 0003 | `scheduling_rooms` | `rooms`, `availability_slots`, `sessions` |
| 0004 | `attendance_progress` | `attendances`, `session_notes`, `student_progress`, `tasks`, `study_logs`, `activity_submissions` |
| 0005 | `communication` | `messages`, `notifications`, `announcements`, coluna `push_token` em `users` |
| 0006 | `finance` | `plans`, `student_plans`, `payments` |
| 0007 | `reports` | materialized view `tenant_kpis` |
| 0008 | `super_admin` | `super_admins`, `saas_plans`, `audit_logs`, colunas `saas_plan_id` e `saas_status` em `tenants` |
| 0009 | `ai_pedagogica` | `ai_student_panoramas`, `ai_activity_suggestions` |

### Spec 9 — IA Pedagógica
- **Panorama do aluno:** agrega `study_logs` + `session_notes` + `student_progress` por disciplina; com `OPENAI_API_KEY` usa GPT-4o-mini para análise semântica, sem chave usa lógica de fallback determinístico
- **Agrupamento por tópico:** `GET /ai/groups/by-topic` identifica alunos com tópicos de estudo em comum
- **Geração de atividades:** `POST /ai/activities/generate/:studentId` cria exercício/quiz/desafio personalizado; professor aprova ou rejeita antes de liberar para o aluno
- **Cron `0 20 * * *`:** recalcula panorama para todos os alunos com atividade no dia
- Frontend: `/student/ai` (panorama + atividades aprovadas), `/teacher/ai` (revisar atividades + agrupamentos), `/guardian/ai` (panorama do filho)

## App Mobile (Expo)

Um único app para os 4 roles — layout adapta automaticamente para celular (aluno, responsável) e tablet (professor, admin).

### Autenticação
- Tela de login com slug da escola + e-mail + senha
- Token armazenado em `expo-secure-store` (nunca AsyncStorage)
- Header `X-Tenant-Slug` enviado em todas as requisições
- Interceptor Axios com refresh automático ao receber 401
- Push token registrado em `POST /users/push-token` após login (`expo-notifications`)

### Telas por role

**Aluno (`(student)/`)** — celular
| Tela | Caminho | Descrição |
|---|---|---|
| Home | `home.tsx` | Próximas aulas + tarefas do dia |
| Tarefas | `tasks/` | Lista com prazo, marcar como feita |
| Diário de estudo | `study-log/` | Registrar assunto + páginas por sessão |
| Atividade | `activity/` | Upload de foto/PDF via câmera ou galeria |
| Progresso | `progress/` | Nível por disciplina com barra visual |
| Notificações | `notifications.tsx` | Marcar lida individualmente ou todas |

**Responsável (`(guardian)/`)** — celular
| Tela | Caminho | Descrição |
|---|---|---|
| Home | `home.tsx` | KPIs do filho (frequência, tarefas, nível médio) |
| Frequência | `attendance/` | Histórico de presença e faltas |
| Tarefas | `tasks/` | Tarefas pendentes e concluídas do filho |
| Financeiro | `finance/` | Saldo de aulas + histórico de pagamentos |
| Chat | `chat/` | Chat 1:1 com professor |
| Progresso | `progress/` | Nível por disciplina do filho |
| Notificações | `notifications.tsx` | Central de avisos |

**Professor (`(teacher)/`)** — tablet
| Tela | Caminho | Descrição |
|---|---|---|
| Presença | `attendance/` | Toggle presente/ausente/justificado por aluno, salvar em lote |
| Notas | `notes/` | Adicionar notas de aula por sessão realizada |
| Tarefas | `tasks/` | Criar tarefas por tipo com prazo; ver pendentes/concluídas |
| Salas | `room/` | Ocupação em tempo real (auto-refresh 30s) |
| Notificações | `notifications.tsx` | Central de avisos |

**Admin (`(admin)/`)** — tablet
| Tela | Caminho | Descrição |
|---|---|---|
| Dashboard | `dashboard/` | KPIs (aulas hoje, faltas, alunos ativos, frequência %, receita, saldo baixo) + alertas de faltas do dia |
| Salas | `rooms/` | CRUD de salas com barra de ocupação em tempo real |
| Notificações | `notifications.tsx` | Central de avisos |

### Build e distribuição
```bash
cd apps/mobile
npx expo start                           # dev com Expo Go
eas build --platform android             # APK para sideload no tablet da escola
eas build --platform ios                 # IPA para App Store / TestFlight
```

Tablets da escola: sideload direto do APK (sem loja).
Alunos e responsáveis: link de download ou Play Store / App Store.

## Variáveis de ambiente obrigatórias

```env
JWT_SECRET=
DATABASE_URL=
REDIS_URL=
RESEND_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Variáveis opcionais (sem chave → modo stub):
```env
ASAAS_API_KEY=          # gateway de pagamento
EVOLUTION_API_URL=      # WhatsApp
EVOLUTION_API_KEY=
OPENAI_API_KEY=         # IA pedagógica — sem chave usa fallback determinístico
EXPO_ACCESS_TOKEN=      # push em escala
```

## Hospedagem recomendada

Hetzner VPS CAX11 (€3/mês) com Docker Compose + Nginx reverse proxy + Certbot (SSL wildcard `*.app.com`).

Build mobile: EAS Build (free tier) → APK Android / IPA iOS.
