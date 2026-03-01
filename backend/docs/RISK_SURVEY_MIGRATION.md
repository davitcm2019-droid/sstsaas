# Migração do Levantamento de Riscos (Hierarquia Nova)

## Objetivo
Migrar dados antigos para o fluxo:

`Empresa > Unidade > Setor > Ambiente > Cargo > Atividade > Risco`

preservando avaliações qualitativas, medições quantitativas e histórico.

## Pré-requisitos
- `FEATURE_STRUCTURED_RISK_SURVEY=true`
- Banco Mongo acessível (`MONGO_URI`)
- Perfil administrador para execução pela API

## Opção 1: Script CLI (recomendado)
```bash
cd backend
npm run risk:migrate:legacy
```

## Opção 2: Endpoint administrativo
`POST /api/risk-survey/maintenance/migrate-legacy`

Permissão necessária: `riskSurvey:configure` (administrador).

## O que a migração faz
1. Para cada `risk_item` legado:
   - Cria/resolve `environment` padrão se ausente
   - Cria/resolve `cargo` no ambiente
   - Cria/resolve `activity` com nome:
     `Atividade migrada - modelo anterior`
   - Vincula `risk_item.activityId` e `risk_item.environmentId`
   - Marca `legacyMigrated=true`
2. Vincula risco à `risk_library`:
   - Se não existir item equivalente, cria como `origem=personalizado`
3. Atualiza `risk_assessment.activityId`
4. Atualiza `risk_measurement.deviceId`:
   - Cria device legado automático por medição quando necessário

## Validação pós-migração
- `GET /api/risk-survey/dashboard`:
  - verificar `counts.riscosMigrados`
- `GET /api/risk-survey/audit?entityType=risk_migration`
- Navegar no frontend:
  - `/levantamento-riscos/ambientes`
  - `/levantamento-riscos`

## Rollback
- A migração é aditiva e não remove snapshots.
- Em rollback de emergência:
  - restaurar backup do MongoDB anterior à execução.
