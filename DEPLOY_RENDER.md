# Deploy no Render — SST SaaS

Este repositório inclui um Blueprint (`render.yaml`) para criar **3 recursos** no Render:

- **Backend**: Web Service (Node/Express)
- **Frontend**: Static Site (Vite/React)
- **Banco**: Render Postgres (`sst-saas-db`)

## 1) Blueprint (recomendado)

1. Suba o repositório no GitHub.
2. No Render: **New + → Blueprint** e selecione o repositório.
3. O Render vai criar os recursos conforme `render.yaml`.

### O que o `render.yaml` faz

- Backend (`sst-saas-backend`)
  - `rootDir: backend`
  - `buildCommand: npm ci`
  - `startCommand: npm start`
  - `healthCheckPath: /api/health`
  - `JWT_SECRET` é gerado automaticamente (`generateValue: true`)
  - `CORS_ORIGIN` deve apontar para a URL do frontend
  - `DATABASE_URL` é injetado a partir do Postgres (`fromDatabase.connectionString`)
- Frontend (`sst-saas-frontend`)
  - `rootDir: frontend`
  - build: `npm ci && npm run build`
  - publish: `dist`
  - **rewrite** `/* → /index.html` (necessário para React Router)
- Postgres (`sst-saas-db`)
  - `plan: free`
  - `ipAllowList: []` (bloqueia acesso externo; mantém acesso interno para serviços do Render na mesma região)

## 2) Banco de dados no Render (como configurar corretamente)

### Estado atual do projeto (importante)

- A persistência no backend ainda é **em memória** (os dados não persistem após restart).
- O Postgres no Render é **pré-configuração** para a fase de persistência. Até implementar essa fase, o backend **não usa** `DATABASE_URL`.

### URLs do Render Postgres

Cada banco no Render tem:

- **Internal Database URL**: para conexões a partir de serviços do Render na **mesma região** (recomendado).
- **External Database URL**: para conectar de fora (psql/local/pgAdmin/etc).

### Recomendação de segurança

- Use sempre o **Internal Database URL** no backend do Render.
- Mantenha `ipAllowList: []` para evitar acesso externo.
- Se você precisar acessar externamente para debug, libere apenas seu IP no allow list (CIDR) e use a **External Database URL**.

## 3) Variáveis de ambiente (Render Dashboard)

### Backend (obrigatórias)

- `JWT_SECRET` (o Blueprint gera automaticamente)
- `CORS_ORIGIN` (ex.: `https://sst-saas-frontend.onrender.com`)

### Backend (preparação para banco)

- `DATABASE_URL` (o Blueprint configura automaticamente via `fromDatabase`)

### Frontend (build-time)

- `VITE_API_URL` (URL base do backend **sem** `/api`, ex.: `https://sst-saas-backend.onrender.com`)

## 4) Deploy manual (sem Blueprint)

Se preferir criar recursos manualmente:

1) Crie o Postgres: **New + → PostgreSQL**  
2) Pegue a **Internal Database URL** do banco no dashboard  
3) No backend, adicione `DATABASE_URL` com essa URL  
4) (Opcional) Restrinja acessos externos no banco (Networking / IP allow list)

## Troubleshooting

- Backend caiu com `Missing required environment variable: JWT_SECRET`: defina `JWT_SECRET` no serviço.
- CORS bloqueando: ajuste `CORS_ORIGIN` para a URL real do frontend (sem barra no final).
- Frontend 404 ao dar refresh em rotas (`/login`, `/dashboard`): falta o rewrite `/* → /index.html` no static site.

