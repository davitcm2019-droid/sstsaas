# Deploy no Render - SST SaaS

Este projeto foi preparado para subir no Render com dois servicos:
- `sst-saas-backend` - Web Service Node/Express
- `sst-saas-frontend` - Static Site React/Vite

O banco continua externo, via MongoDB Atlas em `MONGO_URI`.

## O que o `render.yaml` faz

- cria backend e frontend
- usa plano `free` no backend por padrao
- desliga preview environments
- aplica rewrite SPA no frontend
- inclui `shared/**` no `buildFilter`, para que mudancas em permissoes compartilhadas redeployem backend e frontend
- gera `JWT_SECRET` automaticamente

## Passo a passo

### 1) Subir o codigo para o GitHub

O Render vai ler o `render.yaml` diretamente do repositorio.

### 2) Importar Blueprint

No Render:
1. `New +`
2. `Blueprint`
3. selecione o repositorio
4. confirme o arquivo `render.yaml`
5. clique em `Apply`

### 3) Configurar a unica variavel manual obrigatoria

No servico `sst-saas-backend`, preencha:

- `MONGO_URI`

Ela esta com `sync: false` no blueprint para nao ficar versionada.

Exemplo:

`mongodb+srv://usuario:senha@cluster.mongodb.net/sstsaas?retryWrites=true&w=majority&appName=Cluster0`

Regras praticas:
- use o nome do banco na URI, por exemplo `/sstsaas`
- se a senha tiver caracteres especiais, faca URL-encode
- no Atlas, libere acesso de rede para o Render
- no Atlas, confirme um usuario com permissao de leitura e escrita

### 4) Validar o deploy

Backend:
- healthcheck em `/api/health`
- URL esperada: `https://sst-saas-backend.onrender.com/api/health`

Frontend:
- URL esperada: `https://sst-saas-frontend.onrender.com`

### 5) Criar administrador

Como o cadastro publico agora cria apenas `visualizador`, promova um admin pelo Shell do backend no Render ou por one-off job:

```bash
npm run admin:create -- --nome "Admin" --email admin@local.test --senha "SenhaForte123"
```

## Variaveis finais

### Backend
- `NODE_ENV=production`
- `JWT_SECRET` gerada automaticamente
- `CORS_ORIGIN=https://sst-saas-frontend.onrender.com`
- `MONGO_URI` configurada manualmente

### Frontend
- `VITE_API_URL=https://sst-saas-backend.onrender.com`

## Observacoes operacionais

- O backend esta em `plan: free`. Para producao com menor cold start, troque para `starter` ou superior.
- Preview environments foram desabilitados porque o backend depende de `MONGO_URI` manual e o projeto nao precisa de ambiente efemero neste momento.
- Se voce renomear os servicos no Render, atualize tambem `CORS_ORIGIN` e `VITE_API_URL` no `render.yaml`.

## Troubleshooting

- `Missing required environment variable: MONGO_URI`
  - a variavel nao foi preenchida no backend

- `ServerSelectionError` ou timeout no Mongo
  - IP/regra de rede do Atlas nao liberada
  - credencial incorreta

- frontend abre, mas chamadas para API falham
  - `VITE_API_URL` incorreta
  - `CORS_ORIGIN` do backend nao bate com a URL real do frontend
