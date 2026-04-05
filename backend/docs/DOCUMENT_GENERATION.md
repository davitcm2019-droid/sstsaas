# Arquitetura de Geracao de Documentos PDF — SST SaaS

## Visao geral

O modulo de geracao documental do SST SaaS converte dados de avaliacoes de risco em documentos tecnicos PDF (PGR, LTCAT, Inventario, Ordem de Servico, Laudos). A arquitetura e desacoplada: dados de negocio SST sao separados da camada de apresentacao e renderizacao.

## Fluxo de geracao

```
Request HTTP → Controller → Service → DataResolver → Builder → Composer → Template → Renderer → Storage → Response
```

### Camadas

| Camada | Responsabilidade | Arquivos |
|---|---|---|
| **Controller** | Recebe requisicao HTTP, busca documento/versao, chama service | `modules/documents/controllers/sstDocumentsController.js` |
| **Service** | Orquestra o pipeline: registry → data → builder → template → renderer | `modules/documents/services/documentGenerationService.js` |
| **Registry** | Mapeia tipo documental → builder + template | `modules/documents/services/documentRegistry.js` |
| **DataResolver** | Busca dados complementares (empresa, avaliacoes, contextos) | `sst/pdfDataResolver.js` |
| **Builder** | Transforma dados brutos em `documentModel` normalizado | `modules/documents/builders/baseSstBuilder.js` + builders especificos |
| **Composer** | Consolida riscos, equipe, secoes, plano de acao | `sst/documentComposer.js` |
| **Template** | Gera HTML + CSS auto-contido a partir do `documentModel` | `modules/documents/templates/` |
| **Renderer** | Converte HTML em PDF via Puppeteer | `modules/documents/renderers/puppeteerPdfRenderer.js` |
| **BrowserPool** | Singleton de browser para reutilizacao entre geracoes | `modules/documents/renderers/browserPool.js` |
| **Storage** | Persiste PDF em disco local ou S3 | `modules/documents/renderers/documentStorageFactory.js` |

## Tipos documentais suportados

| Tipo | Builder | Template | Cor |
|---|---|---|---|
| `pgr` | pgrBuilder.js | pgrHtmlTemplate.js | cinza (#6d7178) |
| `ltcat` | ltcatBuilder.js | ltcatHtmlTemplate.js | azul (#0f4c81) |
| `inventario` | inventoryBuilder.js | inventoryHtmlTemplate.js | roxo (#7c3aed) |
| `ordem_servico` | workOrderBuilder.js | workOrderHtmlTemplate.js | ambar (#b45309) |
| `laudo_insalubridade` | insalubrityReportBuilder.js | insalubrityTemplate.js | roxo (#9333ea) |
| `laudo_periculosidade` | periculosidadeReportBuilder.js | periculosidadeTemplate.js | rosa (#be123c) |
| `laudo_tecnico` | technicalReportBuilder.js | technicalReportTemplate.js | cinza (#334155) |

## Como adicionar um novo tipo documental

1. **Criar o builder** em `modules/documents/builders/`:
   ```js
   const { createSstDocumentBuilder } = require('./baseSstBuilder');
   module.exports = createSstDocumentBuilder({
     documentType: 'novo_tipo',
     title: 'Novo Tipo',
     formalTitle: 'Documento Formal Novo',
     ...
   });
   ```

2. **Criar o template** em `modules/documents/templates/`:
   - Para template completo: crie um arquivo `novoTipoHtmlTemplate.js` seguindo o padrao do PGR
   - Para laudos simples: use a factory `createReportHtmlTemplate`

3. **Registrar** no `documentRegistry.js` (se nao estiver usando o registro automatico do `createDefaultRegistry`)

4. **Adicionar secoes** no `sst/documentSectionBuilder.js`

5. **Adicionar blocos normativos** no `sst/documentNormativeLibrary.js` (se aplicavel)

6. **Adicionar validacoes** no `sst/documentReadiness.js` (se o tipo tiver campos obrigatorios especificos)

7. **Incluir no script de exemplo** em `scripts/generateSamplePdfs.js`

## Endpoints REST

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/sst/documents/types` | Lista tipos documentais suportados |
| GET | `/api/sst/documents/issued/:id/html-preview` | Preview HTML do documento emitido |
| GET | `/api/sst/documents/issued/:id/pdf` | Download do PDF renderizado |
| GET | `/api/sst/documents/issued/:id/assets` | Lista assets (HTML/PDF) persistidos |

## Variaveis de ambiente

| Variavel | Padrao | Descricao |
|---|---|---|
| `PUPPETEER_EXECUTABLE_PATH` | auto | Caminho do binario do Chromium (resolvido automaticamente via @sparticuz/chromium em producao) |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | false | Pular download do Chromium bundled (definir `true` em producao) |
| `DOCUMENT_STORAGE_PROVIDER` | local | `local` ou `s3` |
| `AWS_ACCESS_KEY_ID` | — | Credencial AWS para S3 |
| `AWS_SECRET_ACCESS_KEY` | — | Credencial AWS para S3 |
| `AWS_REGION` | — | Regiao AWS |
| `S3_BUCKET` | — | Bucket S3 para armazenamento |

## Teste local

```bash
cd backend
npm run pdf:samples
```

Gera PDFs de exemplo em `backend/tmp/pdfs/` para todos os 7 tipos documentais.
