# ReforçosEscolares — Contexto para o Claude

## Idioma
**Sempre se comunicar com o usuário em português brasileiro.** Todas as respostas, perguntas, resumos e comentários devem ser em pt-BR.

## Visão geral
Monorepo pnpm com três apps: `backend` (NestJS), `frontend` (Next.js 15) e `mobile` (Expo). Plataforma SaaS **multi-tenant** para gestão de aulas de reforço — professores, alunos, responsáveis e administradores em um só lugar. Cada escola de reforço é um tenant isolado por subdomínio (`escola.app.com`).

**Stack:** NestJS · Next.js 15 App Router · Expo (React Native) · PostgreSQL + TypeORM · Redis (Upstash) · BullMQ · Resend (e-mail) · Cloudflare R2 (storage)

**Hospedagem recomendada:** Hetzner VPS CAX11 (€3/mês) com Docker Compose + Nginx + Certbot.

**Build mobile:** EAS Build (free tier) — gera APK para Android e IPA para iOS.

## Roles do sistema

| Role | Descrição |
|---|---|
| `super_admin` | Você — gerencia todos os tenants da plataforma |
| `tenant_admin` | Diretor ou dono da escola de reforço |
| `teacher` | Registra presença, notas de aula e tarefas |
| `student` | Visualiza calendário, tarefas e progresso |
| `guardian` | Acompanha frequência, desempenho e faturas do aluno |

## Estratégia de Multi-tenancy

**Row-level tenancy:** `tenant_id` em todas as tabelas. Uma instância única de banco, custo fixo e migrations rodam uma vez para todos os tenants.

- **`TenantGuard`** resolve o tenant pelo subdomínio da requisição
- **`TenantInterceptor`** injeta automaticamente o `tenant_id` em todas as queries — **nunca filtrar `tenant_id` manualmente** nos serviços quando o interceptor estiver ativo
- Rotas do `super_admin` ficam em domínio separado e **não passam** pelo `TenantGuard`

## Regras de processo

- **Plano de testes obrigatório após toda implementação**: ao concluir qualquer alteração ou adição de código, sempre perguntar: *"Quer que eu execute os testes? Se sim, unitários ou E2E?"* — nunca executar sem confirmação do usuário.
- **Ao concluir uma Spec**: atualizar `CLAUDE.md` (seção "Specs do produto") e `README.md` para refletir os novos módulos, endpoints e migrations adicionados.
- **Alterações de código**: toda mudança deve ser cirúrgica — alterar apenas o necessário para a tarefa, sem refatorações ou limpezas colaterais. Antes de editar um serviço, ler o arquivo inteiro para entender os contratos existentes. Preferir casts (`as any`) a alterar assinaturas de métodos que funcionam. Se a mudança pode quebrar algo adjacente, testar esse caminho antes de concluir.
- **Feedback visual obrigatório em toda ação assíncrona**: qualquer botão ou ação que dispara uma chamada ao backend **deve** mostrar spinner + texto de carregamento e ficar desabilitado enquanto aguarda resposta. Padrão: `disabled={loading}` + `className="... disabled:opacity-60"` + indicador de loading + texto condicional `{loading ? 'Salvando...' : 'Salvar'}`. Nunca implementar uma ação de backend sem este padrão.
- **Skeleton loading obrigatório no carregamento de páginas**: nunca usar `if (loading) return <PageSpinner />` — isso bloqueia a tela inteira e dá a sensação de sistema travado. Em vez disso, renderizar a estrutura da página imediatamente e usar skeletons por seção.
- **Largura de formulários e cards sempre full-width**: nunca aplicar `max-w-*` em formulários ou cards de páginas internas (dashboard, settings, etc.). O layout já é delimitado pelo AppShell — restringir a largura cria áreas mortas e desperdicia espaço. Usar `w-full` ou sem restrição de largura.
- **Swagger obrigatório em mudanças estruturais no backend**: toda vez que um endpoint for adicionado, removido ou tiver sua assinatura alterada (path, método HTTP, parâmetros, body ou resposta), o controller correspondente **deve** ser atualizado com `@ApiOperation`, `@ApiResponse`, `@ApiParam` e `@ApiQuery` conforme aplicável. O Swagger é gerado automaticamente pelo NestJS e fica disponível em `http://localhost:3000/docs` (somente em dev). Padrão mínimo por endpoint: `@ApiOperation({ summary: '...' })` + ao menos um `@ApiResponse`. Controllers novos devem sempre ter `@ApiTags('Nome do módulo')` + `@ApiBearerAuth()` no nível da classe.

## Comandos essenciais

```bash
# Infraestrutura (rodar primeiro)
docker compose up -d

# Backend (porta 3000)
cd apps/backend && pnpm dev

# Frontend (porta 3001)
cd apps/frontend && pnpm dev

# Build e lint
pnpm build
pnpm lint

# Migrations
cd apps/backend
pnpm migration:run     # rodar pendentes
pnpm migration:revert  # reverter última

# Testes
cd apps/backend && pnpm test
cd apps/backend && pnpm test:e2e
cd apps/backend && pnpm test:cov

# Mobile (Expo)
cd apps/mobile && npx expo start          # dev com Expo Go
cd apps/mobile && eas build --platform android  # gera APK
cd apps/mobile && eas build --platform ios      # gera IPA
```

## Arquitetura do backend

### Guards e decorators
- **Guards globais em cascata:** `JwtAuthGuard` → `TenantGuard` → `RolesGuard` → `ThrottlerGuard`
- **Rotas públicas:** usar `@Public()` — nunca remover o guard global
- **Roles:** usar `@Roles('tenant_admin')`, `@Roles('teacher')` etc. no controller
- **Ownership:** `@UseGuards(OwnershipGuard('nome_tabela'))` valida `resource.user_id === req.user.sub` sem acoplamento à entidade
- **`TenantGuard` dual:** resolve o tenant pelo subdomínio da requisição (web) **ou** pelo header `X-Tenant-Slug` (mobile). O mobile não tem subdomínio — o usuário digita o slug da escola na tela de login e o app envia esse header em todas as requisições

### Scoping automático por tenant
`TenantInterceptor` garante que todas as queries incluam o filtro `tenant_id` automaticamente. **Não** adicionar filtro `tenant_id` manual nos serviços — será duplicado. O `tenant_id` fica disponível em `req.tenant.id`.

### Migrations
- `synchronize: false` + `migrationsRun: true`
- Nunca alterar schema diretamente — sempre criar nova migration em `src/database/migrations/` com numeração sequencial (ex.: `0003_descricao.ts`)
- Migrations rodam automaticamente ao iniciar o backend
- Nome da classe **deve** terminar com timestamp numérico JavaScript: `NomeDaClasse1714900000000`
  - Sem o sufixo o TypeORM rejeita **todas** as migrations e o backend não inicia
  - Usar timestamps sequenciais para não colidir com migrations existentes
- **Toda nova tabela deve ter a coluna `tenant_id uuid NOT NULL` com FK para `tenants.id`**

### Entidades
- Sempre usar arquivos `*.entity.ts` separados do service — o glob do TypeORM busca `src/**/*.entity{.ts,.js}`; entidades definidas dentro de `.service.ts` **não são encontradas automaticamente**
- `autoLoadEntities: true` no `AppModule` carrega entidades registradas via `TypeOrmModule.forFeature([...])` mesmo que o glob não as encontre — **nunca remover**
- Toda entidade deve ter campo `tenantId: string` com `@Column()` e index composto `[tenant_id, id]`

### Autenticação e tokens
- Access token: JWT 15min, aceito via `Authorization: Bearer` **ou** cookie `access_token`
- Refresh token: 7 dias, armazenado como hash SHA-256 no banco (nunca plain text)
- Token rotation: ao renovar, o token anterior é revogado
- Tokens sensíveis ficam em cookies `HttpOnly` setados pelo backend
- O payload do JWT inclui `tenantId` — usado pelo `TenantGuard` para validar o contexto

### Redis
- Provider global: `REDIS_CLIENT` (injetar com `@Inject(REDIS_CLIENT)`)
- Nunca usar `Map` em memória para cache compartilhado — usar Redis
- Chaves Redis sempre prefixadas com `{tenantId}:` para evitar colisão entre tenants

## Arquitetura do frontend (Next.js)

### Autenticação
- 100% via cookies `HttpOnly` setados pelo backend
- **Nunca usar `localStorage`** para tokens — vulnerável a XSS
- Renovação de token é automática: intercepta 401 e chama `POST /auth/refresh` com `credentials: 'include'`

### Subdomínios e tenant
- O frontend lê o subdomínio (`window.location.hostname`) para identificar o tenant
- Middleware Next.js verifica JWT via `jose.jwtVerify` lendo o cookie `access_token` e redireciona para login se não autenticado
- `JWT_SECRET` obrigatório em `apps/frontend/.env.local` (mesmo valor do backend)
- Rotas públicas definidas em `PUBLIC_PATHS` no `middleware.ts` — adicionar toda nova rota pública nessa lista

### Route groups Next.js — atenção
Os route groups são **organizacionais** e **não criam prefixo de URL**:

| Arquivo | URL resultante |
|---|---|
| `(admin)/admin/page.tsx` | `/admin` |
| `(admin)/admin/users/page.tsx` | `/admin/users` |
| `(teacher)/teacher/page.tsx` | `/teacher` |
| `(student)/student/page.tsx` | `/student` |

Nunca criar links com `/(admin)/...` — o prefixo do grupo não existe na URL.

### API client
Usar sempre o cliente centralizado em `src/lib/api.ts` com `api.get/post/patch/delete()` — ele já tem o interceptor de refresh automático e envia `credentials: 'include'`. Nunca usar `fetch` diretamente nas páginas.

## Arquitetura do mobile (Expo)

### Decisão de arquitetura
Expo com React Native — **um único app** que serve três contextos de uso distintos:

| Persona | Dispositivo | Onde usa |
|---|---|---|
| `student` | Celular pessoal | Em casa ou no reforço |
| `guardian` | Celular pessoal | Em casa |
| `teacher` / `tenant_admin` | Tablet do reforço | Na escola |

Após o login com o slug da escola, o app detecta o role do usuário pelo JWT e exibe a experiência correspondente. O layout adapta automaticamente: phone layout para aluno e responsável, tablet layout para professor e admin.

Motivo da câmera nativa: upload de foto da atividade feita e corrigida (aluno) e eventuais registros do professor.

### Autenticação no mobile
- Cookies `HttpOnly` **não funcionam** em React Native — o app usa `Authorization: Bearer` no header
- Tokens armazenados em `expo-secure-store` (criptografado pelo keychain do dispositivo) — **nunca AsyncStorage simples**
- O backend já aceita Bearer token além de cookie — nenhuma mudança necessária no backend
- Refresh token enviado via body (`{ refreshToken }`) em `POST /auth/refresh/mobile`
- Ao receber 401, o interceptor do Axios renova o token automaticamente antes de retentar

### Identificação de tenant no mobile
- O tenant não vem do subdomínio (não há URL no app)
- Na tela de login, o usuário digita o **slug da escola** (ex.: `escola-silva`)
- O app envia o slug no header `X-Tenant-Slug` em todas as requisições
- O `TenantGuard` resolve o tenant pelo header quando não há subdomínio

### Câmera e uploads
- `expo-camera` para captura de foto
- `expo-image-picker` para seleção da galeria
- Upload via `multipart/form-data` para `POST /attendance/activity-submissions`
- Arquivo armazenado no Cloudflare R2; URL retornada e salva em `activity_submissions.file_url`

### Push notifications
- `expo-notifications` + Expo Push Notification Service (gratuito)
- Token de push registrado no backend em `POST /users/push-token` após login
- Backend envia via Expo HTTP API — sem Firebase/APNs direto, o Expo gerencia o roteamento
- Variável: `EXPO_ACCESS_TOKEN` no `.env` (necessário apenas para envio server-side com rate limit alto)

### Distribuição do app
- **Tablet do reforço:** APK instalado diretamente via EAS Build (sideload Android) ou MDM — não precisa de loja
- **Celular de aluno e responsável:** distribuído via link de download (EAS Update / Expo Go em dev) ou publicado na Play Store / App Store quando escalar

### Estrutura de pastas do app mobile
```
apps/mobile/
  app/                        ← Expo Router (file-based routing)
    (auth)/
      login.tsx               ← slug da escola + e-mail/senha
    (student)/                ← role: student — celular
      home.tsx                ← próximas aulas, tarefas do dia
      tasks/                  ← tarefas com prazo, marcar como feita
      study-log/              ← diário de estudo (assunto + páginas)
      activity/               ← upload de atividade (câmera)
      progress/               ← linha do tempo de evolução
      notifications.tsx
    (guardian)/               ← role: guardian — celular
      home.tsx                ← resumo do(s) filho(s)
      attendance/             ← frequência e faltas
      tasks/                  ← tarefas pendentes do filho
      progress/               ← evolução por disciplina
      finance/                ← saldo de aulas, pagamentos
      chat/                   ← chat com professor
      notifications.tsx
    (teacher)/                ← role: teacher — tablet
      attendance/             ← lista de presença por sessão
      notes/                  ← notas de aula
      tasks/                  ← gerenciar tarefas dos alunos
      room/                   ← ocupação das salas em tempo real
      notifications.tsx
    (admin)/                  ← role: tenant_admin — tablet
      dashboard/              ← KPIs, salas, faltas do dia
      rooms/                  ← gestão de salas
      notifications.tsx
  components/
    phone/                    ← componentes otimizados para celular
    tablet/                   ← componentes otimizados para tablet
  lib/
    api.ts                    ← Axios com interceptor de refresh
    auth.ts                   ← SecureStore helpers
    layout.ts                 ← detecta se é tablet (width > 768) e ajusta layout
```

## Variáveis de ambiente

O `.env` fica na **raiz do monorepo**. O frontend usa `apps/frontend/.env.local`.

| Variável | Onde | Obrigatória em prod |
|---|---|---|
| `JWT_SECRET` | `.env` | Sim — throw se ausente no backend |
| `DATABASE_URL` | `.env` | Sim |
| `REDIS_URL` | `.env` | Sim (Upstash URL) |
| `RESEND_API_KEY` | `.env` | Sim (e-mail transacional) |
| `R2_ACCOUNT_ID` | `.env` | Sim (Cloudflare R2) |
| `R2_ACCESS_KEY_ID` | `.env` | Sim |
| `R2_SECRET_ACCESS_KEY` | `.env` | Sim |
| `R2_BUCKET_NAME` | `.env` | Sim |
| `NEXT_PUBLIC_API_URL` | `.env.local` | Sim |
| `ASAAS_API_KEY` | `.env` | Não (stub sem chave — Spec 6) |
| `EVOLUTION_API_URL` | `.env` | Não (stub sem chave — Spec 5) |
| `EVOLUTION_API_KEY` | `.env` | Não (stub sem chave — Spec 5) |
| `OPENAI_API_KEY` | `.env` | Não (stub sem chave — Spec 9) |
| `EXPO_ACCESS_TOKEN` | `.env` | Não (só necessário para envio push em escala) |

## Segurança

### Isolamento de tenant
- `TenantInterceptor` garante que nenhuma query retorna dados de outro tenant
- Todo teste de integração deve verificar o isolamento: uma requisição com `tenant_id: A` **não pode** retornar dados do `tenant_id: B`

### Headers HTTP
- `helmet()` está ativo em `main.ts` — nunca remover.

### Rate limiting
- `ThrottlerGuard` global: `short` (10 req/s), `medium` (100 req/min)
- Endpoints sensíveis têm `@Throttle` específico — **não remover**:
  - `POST /auth/login` → 5 req/min
  - `POST /auth/signup` → 5 req/min
  - `POST /auth/forgot-password` → 3 req/min
  - `POST /auth/reset-password` → 5 req/hora
  - `POST /auth/verify-email` → 10 req/hora
- Ao criar novos endpoints de autenticação ou operação sensível, sempre adicionar `@Throttle` com limite conservador.

### Criptografia
- Usar **AES-256-GCM** para todos os dados sensíveis novos — nunca CBC.
  - GCM inclui auth tag (16 B) que detecta adulteração do ciphertext.
  - Layout padrão GCM: `[IV 12B][authTag 16B][ciphertext]`

### Cookies de autenticação
- Sempre `httpOnly: true` — nunca expor tokens via JavaScript.
- `secure: true` apenas em `NODE_ENV=production`.
- `sameSite: 'lax'`. Não alterar para `none` sem adicionar CSRF token.

### Validação de entrada
- **`@Body() body: any` é proibido** em novos endpoints — sempre criar DTO com `class-validator`.
- Sem DTO, o `ValidationPipe` com `whitelist: true` não filtra campos extras → risco de mass assignment.

### Audit logs
- Todas as ações de `tenant_admin` e `super_admin` devem ser gravadas em `audit_logs` com `timestamp`, `userId` e `tenantId`.

---

## Convenções de código

- **DTOs obrigatórios** com `class-validator` em todos os `@Body()` dos controllers
- `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- **Criptografia:** usar AES-256-GCM (não CBC) para novos dados sensíveis
- **Sem comentários** explicando o que o código faz — só comentar o "porquê" não óbvio
- Sem `synchronize: true` no TypeORM — sempre migration
- Entidades novas: arquivo `nome.entity.ts` separado do service

## Módulos e suas localizações

| Spec | Módulo | Pasta |
|---|---|---|
| 1 | Tenancy + Auth | `src/modules/auth/`, `src/modules/tenants/` |
| 2 | Disciplinas, Turmas e Vínculos | `src/modules/subjects/`, `src/modules/groups/` |
| 3 | Agendamento de Aulas | `src/modules/scheduling/` |
| 4 | Presença e Acompanhamento Pedagógico | `src/modules/attendance/`, `src/modules/progress/`, `src/modules/tasks/` |
| 5 | Comunicação | `src/modules/communication/` (messages, notifications, announcements, cron) |
| 6 | Financeiro | `src/modules/finance/` (plans, student-plans, payments) |
| 7 | Relatórios e Dashboards | `src/modules/reports/` (materialized view tenant_kpis, cron de refresh) |
| 8 | Super Admin — Plataforma | `src/modules/super-admin/` |
| 9 | IA Pedagógica | `src/modules/ai/` (panoramas, suggestions, cron, agrupamentos) |

## Specs do produto

### Spec 1 — Tenancy + Auth (MVP)
**Tabelas:** `tenants`, `users`, `refresh_tokens`, `invites`

**Funcionalidades:**
- Cadastro self-service de tenant (escola) com slug único → subdomínio automático
- Login / logout / refresh token para todos os roles
- Forgot / reset password via e-mail (Resend)
- Convites por e-mail com token para professor, aluno e responsável
- `TenantGuard` + `TenantInterceptor` globais
- Perfil básico por role (foto, dados pessoais)
- Rate limiting em todos os endpoints de auth

---

### Spec 2 — Disciplinas, Turmas e Vínculos (MVP)
**Tabelas:** `subjects`, `groups`, `teacher_subjects`, `student_enrollments`, `guardian_students`

**Funcionalidades:**
- CRUD de disciplinas com cor e ícone
- Criação de turmas / níveis
- Vínculo professor ↔ disciplina
- Matrícula de aluno em disciplinas
- Vínculo responsável ↔ aluno (N:N)
- Dashboard por role com KPIs básicos

---

### Spec 3 — Agendamento de Aulas (MVP)
**Tabelas:** `availability_slots`, `sessions`, `rooms`

**Funcionalidades:**
- Professor cadastra horários disponíveis (recorrentes via `rrule` ou avulsos)
- Agendamento pelo admin ou responsável
- Status da sessão: `agendada` → `confirmada` → `realizada` / `cancelada`
- Canal: presencial ou online (link Meet)
- Vista de calendário semanal e mensal
- Cancelamento com motivo + notificação automática
- CRUD de salas com capacidade máxima por tenant
- Alocação automática de aluno em sala disponível ao registrar presença (menor ocupação primeiro)
- Turmas fixas (ex.: 5º ano, infantil) têm `room_id` fixo e não participam da alocação automática
- Admin visualiza ocupação em tempo real por sala

---

### Spec 4 — Presença e Acompanhamento Pedagógico (MVP)
**Tabelas:** `attendances`, `session_notes`, `student_progress`, `tasks`, `study_logs`, `activity_submissions`

**Funcionalidades:**
- Registro de presença: `presente` / `ausente` / `justificado`
- Notas de aula pelo professor ao finalizar sessão
- Tarefas criadas pelo professor; aluno marca como feita
- Linha do tempo de evolução por disciplina
- Nível do aluno: `iniciante` → `básico` → `intermediário` → `avançado`
- Alerta automático para responsável em 2 faltas seguidas
- **Diário de estudo:** aluno registra assunto estudado + quantidade de páginas lidas por sessão (`study_logs`)
- **Envio de atividade:** aluno faz upload (foto ou PDF) da atividade após concluída e corrigida (`activity_submissions`); armazenado no Cloudflare R2
- **Tarefas com prazo:** campo `due_date` em `tasks`; sistema monitora e dispara lembretes antes do vencimento para aluno e professor
- Tarefas do tipo `trabalho`, `eureka` e `trilha` além do tipo padrão

---

### Spec 5 — Comunicação
**Tabelas:** `messages`, `notifications`, `announcements`

**Funcionalidades:**
- Chat 1:1 responsável ↔ professor
- Notificações in-app: aula agendada, falta, tarefa nova
- Avisos gerais do admin para roles selecionados
- E-mail transacional via Resend: convites, reset, resumo semanal
- Push notification via Web Push
- **Lembretes de prazo de tarefas:** notificação automática para aluno e professor quando `due_date` se aproxima (D-2 e D-1); cron `0 8 * * *` verifica tarefas pendentes
- **Alerta de faltas ao final do dia:** relatório diário de ausências gerado às 18h para o `tenant_admin` entrar em contato com os responsáveis
- **WhatsApp para responsáveis (opcional):** integração via Evolution API — `EVOLUTION_API_URL` + `EVOLUTION_API_KEY` vazios → modo stub (só notificação in-app). Disparado em: falta do aluno, tarefa próxima do vencimento não entregue

---

### Spec 6 — Financeiro
**Tabelas:** `plans`, `student_plans`, `payments`

**Funcionalidades:**
- Admin cadastra pacotes (ex: 10 aulas Matemática — R$ 300)
- Matrícula do aluno em pacote; saldo decrementado por sessão realizada
- Registro de pagamento manual (ou integração Asaas/Pix opcional)
- Alerta quando aluno tem ≤ 2 aulas restantes
- Relatório financeiro mensal por tenant
- Histórico de pagamentos por aluno

**Regras:**
- `ASAAS_API_KEY` vazio → operação em modo manual sem gateway de pagamento
- Pagamentos armazenados sem dados de cartão — apenas status e referência externa

---

### Spec 7 — Relatórios e Dashboards
**Funcionalidades:**
- **Admin:** alunos ativos, presença %, receita, aulas realizadas
- **Professor:** carga horária, alunos por disciplina, tarefas pendentes
- **Responsável:** frequência, progresso, próximas aulas, saldo
- **Aluno:** próprio progresso, tarefas, calendário
- Export PDF de desempenho por aluno (BullMQ + `pdf-lib`)
- Materialized view para KPIs pesados (refresh agendado via `@nestjs/schedule`)

---

### Spec 8 — Super Admin — Plataforma
**Funcionalidades:**
- Dashboard global: tenants ativos, receita plataforma, uso de storage
- Ativar / suspender / excluir tenant
- Gestão de planos SaaS (free / pro / enterprise)
- Impersonation: entrar no tenant como admin para suporte
- Logs de auditoria globais
- Auth separado com TOTP obrigatório (2FA via `otplib`)

**Importante:** `super_admin` autentica em domínio separado — não passa pelo `TenantGuard`. É uma entidade de usuário completamente independente dos `users` dos tenants.

### Spec 9 — IA Pedagógica
**Tabelas:** `ai_student_panoramas`, `ai_activity_suggestions`

**Funcionalidades:**
- **Panorama do aluno:** a partir do histórico de `study_logs`, `session_notes` e `student_progress`, gera um resumo automático indicando pontos fortes, assuntos que precisam de reforço e assuntos nunca estudados. Atualizado após cada sessão finalizada
- **Agrupamento por assunto comum:** identifica alunos (mesmo de turmas diferentes) que têm assuntos em comum para estudo ou atividades compartilhadas. Resultado exibido no dashboard do professor e do admin
- **Geração de atividades e quizzes:** cria exercícios personalizados baseados no que o aluno está estudando (assunto + nível atual); professor revisa antes de liberar para o aluno

**Regras:**
- `OPENAI_API_KEY` vazio → retorna sugestões de fallback predefinidas; panorama ainda é gerado com base em dados do banco (sem análise semântica)
- Panorama recalculado via cron `0 20 * * *` para todos os alunos com atividade no dia

---

## Testes

### Unitário vs E2E

- **Unitário** (`.spec.ts` ao lado do arquivo): lógica pura — cálculos, transformações, regras de negócio. **Mocka tudo externo** (DB, Redis, HTTP, crons).
- **E2E** (`.e2e-spec.ts` em `test/`): fluxos completos com banco PostgreSQL real (via Docker). **Nunca mockar banco em e2e** — divergência entre mock e produção já causou bugs silenciosos em migrações.
- **Testes de isolamento de tenant obrigatórios**: todo módulo E2E deve verificar que dados de `tenant_A` não vazam para `tenant_B`.

### Padrão de mock para repositórios TypeORM

```typescript
import { getRepositoryToken } from '@nestjs/typeorm';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  create: jest.fn((dto) => dto),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  }),
};

// No providers do TestingModule:
{ provide: getRepositoryToken(MinhaEntidade), useValue: mockRepo }
```

### Padrão de mock para REDIS_CLIENT

Qualquer serviço que injeta `REDIS_CLIENT` precisa deste mock no teste unitário:

```typescript
import { REDIS_CLIENT } from '../../common/redis/redis.module';

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  setex: jest.fn().mockResolvedValue('OK'),
};

// No providers do TestingModule:
{ provide: REDIS_CLIENT, useValue: mockRedis }
```

### `jest.useFakeTimers()` para lógica temporal

Testes com `Date.now()`, `new Date()` ou crons **devem** fixar o tempo para ser determinísticos:

```typescript
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2025-01-15T09:30:00'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

Não usar `jest.useFakeTimers()` sem `jest.useRealTimers()` no teardown — vaza entre testes.

### Configuração E2E

Para rodar e2e:

1. Infra deve estar rodando: `docker compose up -d`
2. Usar banco separado (variável `DATABASE_URL_TEST` ou schema isolado)
3. Cada suite deve rodar migrations no `beforeAll` e truncar tabelas no `afterEach`
4. **Limpar o `ThrottlerStorage` no `afterEach`** — sem isso, o rate limiting acumulado de um teste vaza para o próximo e causa falsos 429

```typescript
beforeAll(async () => {
  app = await createTestApp();
  await dataSource.runMigrations();
});
afterEach(async () => {
  // limpa rate limit acumulado entre testes
  const throttler = app.get(ThrottlerStorage);
  await throttler.reset?.();

  await dataSource.query('TRUNCATE tenants CASCADE');
});
afterAll(async () => {
  await app.close();
});
```

---

## Checklist de verificação de UX

Usar este checklist ao revisar telas ou implementar novas features de interface.

### 1. Entendimento do usuário
- [ ] Existem personas documentadas?
- [ ] Estão claros os principais objetivos/tarefas dos usuários?
- [ ] O fluxo principal do sistema está alinhado com essas tarefas?

### 2. Clareza das telas
- [ ] Cada tela tem 1 objetivo principal evidente?
- [ ] Títulos e rótulos são claros e específicos?
- [ ] Há excesso de texto ou opções que podem ser removidos/simplificados?

### 3. Navegação e arquitetura
- [ ] O usuário entende onde está e como voltar (breadcrumb, título, menu)?
- [ ] Itens de menu estão agrupados por tarefa/objetivo (não por área interna da empresa)?
- [ ] A navegação é consistente em todas as telas?

### 4. Consistência visual
- [ ] Botões principais sempre com a mesma cor/estilo?
- [ ] Tipografia (tamanhos, pesos) segue um padrão?
- [ ] Espaçamentos, ícones e componentes seguem um design system (mesmo que simples)?

### 5. Fluxos de tarefas
- [ ] Tarefas mais frequentes exigem o menor número possível de passos?
- [ ] Informações e campos necessários estão na ordem lógica de preenchimento?
- [ ] Há atalhos para usuários experientes (teclado, ações rápidas)?

### 6. Formulários e erros
- [ ] Campos possuem rótulos claros e exemplos quando necessário?
- [ ] Validações acontecem em tempo real (antes de enviar)?
- [ ] Mensagens de erro explicam o problema e como resolver?
- [ ] Ações críticas permitem desfazer ou têm confirmação bem clara?

### 7. Feedback e estados
- [ ] Ao clicar em um botão, o usuário recebe feedback imediato (loading, mudança visual)?
- [ ] Tarefas longas mostram progresso (barra, etapas, percentual)?
- [ ] Estados vazios (sem dados) explicam o que é e o que fazer em seguida?

### 8. Acessibilidade básica
- [ ] Contraste de cores suficiente para leitura?
- [ ] Tamanho de fonte confortável (sem zoom) e espaçamento adequado?
- [ ] Sistema navegável por teclado nas principais tarefas?
- [ ] Ícones importantes têm texto ou tooltip de apoio?

### 9. Responsividade / mobile
- [ ] Layout se adapta bem em diferentes tamanhos de tela?
- [ ] Botões e áreas clicáveis têm tamanho adequado ao toque?
- [ ] Sem scroll horizontal indevido em telas menores?

### 10. Performance percebida
- [ ] Telas carregam rápido o suficiente para não causar frustração?
- [ ] Há indicadores visuais durante carregamentos (spinners, skeletons)?
- [ ] Operações pesadas foram divididas ou otimizadas (paginação, filtros)?

### 11. Onboarding e ajuda
- [ ] Usuário novo consegue realizar a tarefa principal sem ajuda externa?
- [ ] Existem dicas contextuais ou ajuda rápida em pontos complexos?
- [ ] Documentação/FAQ está acessível a partir do próprio sistema?

### 12. Medição e melhoria contínua
- [ ] Estão sendo medidas métricas básicas (ex: tempo de tarefa, erros, abandono)?
- [ ] Existe um canal simples para feedback do usuário dentro do produto?
- [ ] Existe rotina (mensal/trimestral) de revisão de UX com base em dados?
