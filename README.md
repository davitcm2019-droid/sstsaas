# SST SaaS - Plataforma de Gestao de Seguranca do Trabalho

Aplicacao fullstack (React + Node/Express) para gestao de SST, com autenticacao via JWT e modulos como empresas, tarefas, CIPA, treinamentos, checklists, incidentes, documentos, agenda e levantamento estruturado de riscos.

## Stack

### Frontend
- React 18 + Vite
- TailwindCSS
- React Router
- Axios

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- `bcryptjs`
- `helmet` / `morgan` / `cors`

## Como rodar (local)

### 1) Instalar dependencias

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configurar ambiente

Backend:
- copie `backend/.env.example` para `backend/.env`
- preencha `MONGO_URI`
- preencha `JWT_SECRET`
- ajuste `CORS_ORIGIN` se necessario

Frontend:
- opcionalmente copie `frontend/.env.example` para `frontend/.env`
- ajuste `VITE_API_URL` se o backend nao estiver em `http://localhost:5000`

### 3) Iniciar em modo desenvolvimento

Na raiz:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000/api`

## Bootstrap de administrador

O cadastro publico sempre cria usuarios com perfil `visualizador`.

Para criar ou promover um administrador localmente:

```bash
cd backend
npm run admin:create -- --nome "Admin" --email admin@local.test --senha "SenhaForte123"
```

## Autenticacao

- `POST /api/auth/register` e `POST /api/auth/login` sao publicas.
- As demais rotas em `/api/*` exigem `Authorization: Bearer <token>`.
- O backend aplica RBAC por permissao em cada modulo sensivel.

## Persistencia

Os seguintes modulos usam MongoDB:
- usuarios
- empresas
- tarefas
- eventos
- alertas
- riscos legados
- CIPA
- treinamentos
- incidentes
- documentos
- notificacoes
- inspecoes
- levantamento estruturado de riscos

## Padrao de resposta da API

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
- O blueprint ja cria backend e frontend; so `MONGO_URI` precisa ser preenchida manualmente no backend

## Validacao do login

- A API responde com `meta.code = AUTH_USER_NOT_FOUND` quando o email nao existe e `AUTH_INVALID_PASSWORD` para senha incorreta.
- O frontend valida formato de email e tamanho minimo da senha antes de enviar e mostra mensagens inline para cada campo (`frontend/src/pages/Login.jsx`).
