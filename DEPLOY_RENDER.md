# Deploy no Render — SST SaaS (sem Blueprint)

Este guia é para criar os recursos manualmente no Render (plano free).

## 1) Backend (Web Service)

Render → **New +** → **Web Service**

- Repository: `davitcm2019-droid/sstsaas` (branch `main`)
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/api/health` (se o campo existir)

### Environment Variables (Backend)

Obrigatórias:
- `JWT_SECRET` (gere uma chave forte)
- `CORS_ORIGIN` (URL do frontend, ex.: `https://<SEU-FRONTEND>.onrender.com`)

Banco (PostgreSQL):
- `DATABASE_URL` (use a **Internal Database URL** do Postgres no Render)
- `DATABASE_SSL` (opcional; padrão em produção é `true`)

Opcional (bootstrap de admin no banco):
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`
- `INITIAL_ADMIN_NAME`

## 2) Frontend (Static Site)

Render → **New +** → **Static Site**

### Opção recomendada (usando Root Directory)

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

### Alternativa (sem Root Directory)

- Root Directory: *(vazio)*
- Build Command: `cd frontend && npm ci && npm run build`
- Publish Directory: `frontend/dist`

### Environment Variables (Frontend)

- `VITE_API_URL` = `https://<SEU-BACKEND>.onrender.com` (sem `/api`)

### Redirects/Rewrites (SPA)

Crie um **rewrite**:
- Source: `/*`
- Destination: `/index.html`

Isso é necessário para funcionar refresh em rotas do React Router (ex.: `/login`, `/dashboard`).

## 3) Banco de dados (Render Postgres)

Render → **New +** → **PostgreSQL**

Recomendado:
- Use a **mesma região** do backend (para usar o Internal URL).
- Em **Networking / IP allow list**, mantenha restrito (idealmente sem acesso externo).

### Qual URL usar no `DATABASE_URL`?

- Backend no Render: use a **Internal Database URL**.
- Acesso local (psql/pgAdmin): use a **External Database URL** e libere seu IP no allow list.

## Observações importantes do projeto

- Quando `DATABASE_URL` está configurado, o backend aplica migrations automaticamente ao iniciar.
- Nesta fase, o banco está sendo usado para **autenticação/usuários**. Os demais módulos ainda usam dados em memória.

## Troubleshooting

- “Publish directory does not exist”: confirme se Root/Publish Directory estão coerentes (ex.: Root=`frontend` → Publish=`dist`).
- Backend caiu com `Missing required environment variable: JWT_SECRET`: faltou setar `JWT_SECRET`.
- CORS bloqueando: ajuste `CORS_ORIGIN` para a URL real do frontend (sem barra no final).
