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

- O backend já usa PostgreSQL para persistir usuários e empresas; as migrations são executadas no startup.
- O `render.yaml` provisiona o banco (`sst-saas-db`) e passa a `DATABASE_URL` ao backend.

## Validação do login

- A API responde com `meta.code = AUTH_USER_NOT_FOUND` quando o email não existe e `AUTH_INVALID_PASSWORD` para senha incorreta.
- O frontend valida format de email e tamanho mínimo da senha antes de enviar e mostra mensagens inline para cada campo (`frontend/src/pages/Login.jsx`).
