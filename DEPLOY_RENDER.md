# Deploy no Render — SST SaaS

Este repositório inclui um Blueprint (`render.yaml`) para criar **3 recursos** no Render:

- **Backend**: Web Service (Node/Express)
- **Frontend**: Static Site (Vite/React)
- **Banco**: Render MongoDB (`sst-saas-db`)

O backend **usa MongoDB** para persistir **usuários e empresas** e inicializa a conexão ao subir.

## 1) Blueprint (mais simples)

1. Suba o repositório no GitHub.
2. No Render: **New + → Blueprint** e selecione o repositório.
3. O Render vai criar os recursos conforme `render.yaml`.

### O que o `render.yaml` faz

- Backend (`sst-saas-backend`)
  - `rootDir: backend`
  - `buildCommand: npm ci`
  - `startCommand: npm start`
  - `healthCheckPath: /api/health`
  - `NODE_ENV=production`
  - `JWT_SECRET` gerado automaticamente (`generateValue: true`)
  - `CORS_ORIGIN` deve apontar para a URL do frontend
  - `MONGO_URI` injetado a partir do MongoDB (`fromDatabase.connectionString`)
- Frontend (`sst-saas-frontend`)
  - `rootDir: frontend`
  - build: `npm ci && npm run build`
  - publish: `dist`
  - rewrite `/* → /index.html` (necessário para React Router)
- MongoDB (`sst-saas-db`)
  - `plan: free`
  - `ipAllowList: []` (bloqueia acesso externo; mantém acesso interno para serviços do Render na mesma região)

## 2) Deploy manual (sem Blueprint)

Se preferir criar recursos manualmente:

1) Crie o MongoDB: **New + → MongoDB**  
2) Copie a **Internal Database URL** do banco  
3) Crie o backend: **New + → Web Service** (Root Directory: `backend`)  
4) Configure as variáveis do backend (aba *Environment*)  
5) Crie o frontend: **New + → Static Site** (Root Directory: `frontend`) e configure `VITE_API_URL`  

## 3) Banco de dados no Render (configuração correta)

### URLs do Render MongoDB

CADA banco no Render tem:

- **Internal Database URL**: para conexões a partir de serviços do Render na **mesma região** (recomendado).
- **External Database URL**: para conectar de fora (mongo shell, Compass, etc).

### Recomendação de segurança

- Use sempre o **Internal Database URL** no backend do Render.
- Mantenha `ipAllowList: []` para evitar acesso externo.
- Se precisar acessar externamente para debug, libere apenas seu IP no allow list (CIDR) e use a **External Database URL**.

## 4) Variáveis de ambiente (Render Dashboard)

### Backend (obrigatórias)

- `DATABASE_URL` (use a *Internal Database URL* do Render Postgres)
- `JWT_SECRET`
- `CORS_ORIGIN` (ex.: `https://sst-saas-frontend.onrender.com`)

### Backend (opcional)

- `DATABASE_SSL` (`true`/`false`) — se `NODE_ENV` não for `production`, defina `DATABASE_SSL=true` no Render.

### Frontend (build-time)

- `VITE_API_URL` (URL base do backend **sem** `/api`, ex.: `https://sst-saas-backend.onrender.com`)

## Troubleshooting

- Backend caiu com `Missing required environment variable`: configure as variáveis obrigatórias no serviço.
- Falha de conexão no Postgres no Render: garanta `NODE_ENV=production` ou `DATABASE_SSL=true`.
- CORS bloqueando: ajuste `CORS_ORIGIN` para a URL real do frontend (sem barra no final).
- Frontend 404 ao dar refresh em rotas (`/login`, `/dashboard`): falta o rewrite `/* → /index.html` no static site.
