# Checklist de Deploy - Levantamento de Riscos

## 1) Configuração
- [ ] `FEATURE_STRUCTURED_RISK_SURVEY=true`
- [ ] `MONGO_URI` válido
- [ ] `JWT_SECRET` válido
- [ ] `CORS_ORIGIN` aponta para frontend

## 2) Build e testes
- [ ] `npm run test` (backend)
- [ ] `npm run build` (frontend)

## 3) Migração
- [ ] Executar `npm run risk:migrate:legacy` (ou endpoint administrativo)
- [ ] Validar auditoria de migração

## 4) Smoke test funcional
- [ ] Criar ambiente em `/levantamento-riscos/ambientes`
- [ ] Criar cargo no ambiente
- [ ] Criar atividade no cargo
- [ ] Criar risco via biblioteca (tipo + item)
- [ ] Registrar avaliação qualitativa
- [ ] Registrar avaliação quantitativa com device
- [ ] Finalizar levantamento e confirmar bloqueio read-only

## 5) Monitoramento
- [ ] Verificar logs de erro backend
- [ ] Verificar métricas básicas de uso no dashboard do módulo
