# Guia de Teste do Sistema SST SaaS

## Como testar o sistema (local)

### 1) Configurar variáveis de ambiente (backend)

Crie `backend/.env` baseado em `backend/.env.example`.

### 2) Iniciar backend

```bash
cd backend
npm install
npm start
```

Backend: `http://localhost:5000/api`

### 3) Iniciar frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

## Login / Registro

- Por segurança, o repositório não versiona credenciais fixas.
- Para testar, crie uma conta em `http://localhost:3000/register` e faça login em `http://localhost:3000/login`.

## Checklist funcional (manual)

### Autenticação
- [ ] Registrar usuário
- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas (esperado: 401)
- [ ] Rotas protegidas sem token (esperado: 401)

### Empresas
- [ ] Listar empresas
- [ ] Criar / editar / excluir empresa
- [ ] Buscar e filtrar

### Tarefas / Agenda
- [ ] Criar / editar / excluir tarefa
- [ ] Verificar filtros (status, prioridade, categoria, empresa)

### CIPA / Treinamentos / Ações / Riscos
- [ ] CRUD básico de cada módulo

### Checklists / Incidentes / Documentos
- [ ] Listar e filtrar
- [ ] Criar inspeção (checklists)
- [ ] Criar incidente
- [ ] Simular download de documento

