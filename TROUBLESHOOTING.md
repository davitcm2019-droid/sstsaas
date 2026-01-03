# Guia de Solução de Problemas - SST SaaS

## 1) Backend não inicia

### Sintoma
- Erro ao subir o servidor (ex.: falta de variáveis de ambiente).

### Verificações
- Confirme que existe `backend/.env` (use `backend/.env.example` como base).
- Variáveis obrigatórias:
  - `JWT_SECRET`
  - `CORS_ORIGIN`

## 2) Erro 401 (Unauthorized) no frontend

### Causa comum
- Chamadas para a API sem token JWT.

### Verificações
- Faça login e confirme que o token foi armazenado no navegador.
- Se o token expirou, faça login novamente.

## 3) Erros de CORS no navegador

### Causa comum
- `CORS_ORIGIN` não permite a origem do frontend.

### Correção
- Em dev com Vite (porta 3000): `CORS_ORIGIN=http://localhost:3000`
- Em produção: use a URL pública do frontend.

## 4) Dicas rápidas

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run dev
```

