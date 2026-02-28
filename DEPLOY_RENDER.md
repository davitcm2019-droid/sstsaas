# Deploy no Render — SST SaaS (MongoDB Atlas)

Este repositório usa:
- Backend Node/Express (`backend`)
- Frontend React/Vite (`frontend`)
- Banco externo MongoDB Atlas (via `MONGO_URI`)

## 1) Blueprint (render.yaml)

O `render.yaml` cria dois serviços:
- `sst-saas-backend` (Web Service)
- `sst-saas-frontend` (Static Site)

No backend, `MONGO_URI` está com `sync: false`, então você precisa preencher manualmente no Render.

## 2) Variáveis obrigatórias

### Backend
- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN` (URL do frontend em produção)

### Frontend
- `VITE_API_URL` (URL do backend sem `/api`)

## 3) MONGO_URI (Atlas)

Exemplo:

`mongodb+srv://usuario:senha@cluster.mongodb.net/sstsaas?retryWrites=true&w=majority&appName=Cluster0`

Regras práticas:
- Use o nome do banco na URI (`/sstsaas`).
- Se senha tiver caracteres especiais, faça URL-encode.
- Em Atlas -> **Network Access**, libere o IP do Render (ou `0.0.0.0/0` temporariamente).
- Em Atlas -> **Database Access**, confirme usuário com permissão de leitura/escrita.

## 4) Troubleshooting

- Erro `Missing required environment variable: MONGO_URI`:
  - variável não configurada no serviço backend.

- Erro de conexão com Atlas (`ServerSelectionError`):
  - IP não liberado no Atlas ou credencial incorreta.

- Frontend abre, mas API falha:
  - `VITE_API_URL` inválida ou `CORS_ORIGIN` incorreta.
