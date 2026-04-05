# Backend SST SaaS

## Documentos tecnicos em PDF

O download do PDF continua no mesmo endpoint:

`GET /api/sst/documents/issued/:id/pdf`

Prontidao documental (pre-check de emissao):

`GET /api/sst/documents/readiness?documentType=&scopeType=&scopeRefId=`

Fluxo operacional:

1. Emitir o documento no SST pela tela de documentos tecnicos.
2. O backend consolida a versao emitida.
3. O endpoint de PDF resolve dados auxiliares da empresa e gera:
   - capa
   - sumario
   - secoes por tipo documental
   - paginacao e hash da versao

## Testes

```bash
cd backend
npm test
```

## Geracao local de PDFs de exemplo

```bash
cd backend
node src/scripts/generateSamplePdfs.js
```

Arquivos gerados:

- `backend/tmp/pdfs/*.pdf`

## Observacoes

- O motor de PDF usa `PDFKit`.
- O endpoint e o contrato HTTP do download permanecem os mesmos.
- Os documentos usam fallbacks em pt-BR quando algum dado nao existe na base tecnica.
