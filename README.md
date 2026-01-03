# SST SaaS — Plataforma de Gestão de Segurança do Trabalho

Aplicação fullstack (React + Node/Express) para gestão de SST, com autenticação via JWT e módulos como empresas, tarefas, CIPA, treinamentos, checklists, incidentes e documentos.

## Stack

### Frontend
- React 18 + Vite
- TailwindCSS
- React Router
- Axios

### Backend
- Node.js + Express
- JWT (`jsonwebtoken`)
- `bcryptjs`
- `helmet` / `morgan` / `cors`

## Como rodar (local)

### 1) Instalar dependências

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configurar ambiente do backend

Crie `backend/.env` com base em `backend/.env.example`.

Variáveis obrigatórias:
- `JWT_SECRET`
- `CORS_ORIGIN`

### 3) Iniciar em modo desenvolvimento

Na raiz:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000/api`

## Autenticação

- `POST /api/auth/register` e `POST /api/auth/login` são públicas.
- As demais rotas em `/api/*` exigem `Authorization: Bearer <token>`.

## Padrão de resposta da API

Todas as respostas seguem o formato:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "meta": {}
}
```

## Deploy (Render)

- Blueprint: `render.yaml`
- Guia: `DEPLOY_RENDER.md`

## Notas

- Persistência atual é mock (em memória). Ao reiniciar o backend, os dados são perdidos.
- O `render.yaml` já provisiona um Render Postgres e injeta `DATABASE_URL` no backend, mas a integração com banco ainda não foi implementada.
