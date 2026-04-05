const { escapeHtml } = require('./templateUtils');

const PROBABILITY_ROWS = [
  ['1 - Nao ha exposicao', '0', 'Nenhum contato com o agente ou contato improvavel.'],
  ['2 - Exposicao a niveis baixos', '1', 'Contatos nao frequentes com o agente.'],
  ['3 - Exposicao moderada', '2', 'Contato frequente em baixas concentracoes ou eventual em altas concentracoes.'],
  ['4 - Exposicao elevada', '3', 'Contato frequente com o agente em concentracoes elevadas.'],
  ['5 - Exposicao elevadissima', '4', 'Contato frequente com o agente em concentracoes elevadissimas.']
];

const EFFECT_ROWS = [
  ['1 - Pouca importancia', '0', 'Efeitos reversiveis de pouca importancia ou apenas suspeitos.'],
  ['2 - Preocupantes', '1', 'Efeitos reversiveis preocupantes.'],
  ['3 - Severos', '2', 'Efeitos severos ou com alta capacidade de afastamento.']
];

const PRIORITY_ROWS = [
  ['Toleravel', 'Monitoramento e manutencao dos controles existentes.'],
  ['Moderado', 'Controle com planejamento e prazo definido.'],
  ['Alto', 'Resposta prioritaria com plano de acao formal.'],
  ['Critico', 'Intervencao imediata e tratamento tecnico prioritario.']
];

const DEFAULT_TOC = [
  '1 - IDENTIFICACAO DA EMPRESA',
  '2 - AVALIADORES',
  '3 - APRESENTACAO',
  '4 - OBJETIVOS',
  '5 - CONSIDERACOES PRELIMINARES',
  '6 - AREA DE ABRANGENCIA DO PGR NA EMPRESA',
  '7 - AVALIACAO DOS RISCOS',
  '8 - CRITERIOS UTILIZADOS PARA DEFINICAO DO NIVEL DO RISCO',
  '9 - INSTRUMENTO(S) UTILIZADO(S) NA AVALIACAO DOS RISCOS',
  '10 - METODOLOGIA DE USO DO(S) INSTRUMENTO(S)',
  '11 - ANTECIPACAO DOS RISCOS',
  '12 - INVENTARIO DE RISCOS',
  '13 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO',
  '14 - METAS E PRIORIDADES DE CONTROLE',
  '15 - REGISTRO E DIVULGACAO DOS DADOS',
  '16 - RECOMENDACOES A EMPRESA',
  '17 - CONSIDERACOES FINAIS',
  '18 - ENCERRAMENTO'
];

const getSectionParagraphs = (documentModel, key) =>
  documentModel.secoes?.find((section) => section.chave === key)?.paragrafos || [];

const renderParagraphs = (paragraphs = []) =>
  paragraphs.length ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('') : '<p>Sem dados disponiveis.</p>';

const renderStaticRows = (rows = []) =>
  rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row[0])}</td>
          <td class="center">${escapeHtml(row[1])}</td>
          <td>${escapeHtml(row[2])}</td>
        </tr>
      `
    )
    .join('');

const renderTableOfContents = () =>
  DEFAULT_TOC.map(
    (entry, index) => `
      <div class="toc-row">
        <span class="toc-label">${escapeHtml(entry)}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${escapeHtml(String(index + 4))}</span>
      </div>
    `
  ).join('');

const buildWorkforceSummary = (documentModel) => {
  const scopes = Array.isArray(documentModel.raw?.assessmentScope) ? documentModel.raw.assessmentScope : [];
  const total = scopes.reduce((acc, scope) => acc + (Number(scope.context?.quantidadeExpostos || 0) || 0), 0);
  return {
    total,
    masculino: 'Nao informado',
    feminino: 'Nao informado'
  };
};

const renderCover = (documentModel) => `
  <section class="cover">
    <div class="brand-block">
      <div class="brand-name">${escapeHtml(documentModel.identidadeVisual?.brandName || 'CEST')}</div>
      <div class="brand-caption">CONSULTORIA TECNICA EM SEGURANCA E SAUDE DO TRABALHO</div>
    </div>
    <div class="cover-company">${escapeHtml(documentModel.empresa?.nome || 'Nao informado')}</div>
    <div class="cover-code">${escapeHtml(documentModel.documento?.tipo?.toUpperCase() || 'PGR')}</div>
    <div class="cover-title">${escapeHtml(documentModel.documento?.tituloFormal || 'Programa de Gerenciamento de Riscos')}</div>
    <div class="cover-normative">${escapeHtml(documentModel.raw?.documentMeta?.normativeLabel || 'NR 01')}</div>
    <div class="cover-dates">${escapeHtml(documentModel.documento?.vigencia || 'Sem vigencia informada')}</div>
  </section>
`;

const renderIssueFrame = (documentModel) => `
  <section class="section compact">
    <h2>CONTROLE DE EMISSAO</h2>
    <table class="meta-table">
      <tbody>
        <tr>
          <td><strong>Documento</strong></td>
          <td>${escapeHtml(documentModel.emissao?.tipo || 'Nao informado')}</td>
          <td><strong>Empresa</strong></td>
          <td>${escapeHtml(documentModel.emissao?.empresa || 'Nao informado')}</td>
        </tr>
        <tr>
          <td><strong>Vigencia</strong></td>
          <td>${escapeHtml(documentModel.emissao?.vigencia || 'Nao informado')}</td>
          <td><strong>Versao</strong></td>
          <td>v${escapeHtml(String(documentModel.emissao?.versao || 1))}</td>
        </tr>
        <tr>
          <td><strong>Emitido em</strong></td>
          <td>${escapeHtml(documentModel.emissao?.emitidoEm || 'Nao informado')}</td>
          <td><strong>Hash</strong></td>
          <td>${escapeHtml(documentModel.emissao?.hash || 'n/a')}</td>
        </tr>
        <tr>
          <td><strong>Responsavel tecnico</strong></td>
          <td>${escapeHtml(documentModel.emissao?.responsavelTecnico || 'Nao informado')}</td>
          <td><strong>Registro</strong></td>
          <td>${escapeHtml(documentModel.emissao?.registroResponsavel || 'Nao informado')}</td>
        </tr>
      </tbody>
    </table>
  </section>
`;

const renderIdentification = (documentModel) => {
  const workforce = buildWorkforceSummary(documentModel);
  return `
    <section class="section">
      <h2>1 - IDENTIFICACAO DA EMPRESA</h2>
      <div class="label-grid">
        <div><strong>RAZAO SOCIAL:</strong> ${escapeHtml(documentModel.empresa?.nome || 'Nao informado')}</div>
        <div><strong>NOME FANTASIA:</strong> ${escapeHtml(documentModel.empresa?.nomeFantasia || documentModel.empresa?.nome || 'Nao informado')}</div>
        <div><strong>CNPJ:</strong> ${escapeHtml(documentModel.empresa?.cnpj || 'Nao informado')}</div>
        <div><strong>INSCRICAO ESTADUAL:</strong> ${escapeHtml(documentModel.empresa?.inscricaoEstadual || 'Nao informado')}</div>
        <div><strong>ENDERECO:</strong> ${escapeHtml(documentModel.empresa?.endereco || 'Nao informado')}</div>
        <div><strong>CIDADE:</strong> ${escapeHtml(documentModel.empresa?.cidade || 'Nao informado')}</div>
        <div><strong>ESTADO:</strong> ${escapeHtml(documentModel.empresa?.estado || 'Nao informado')}</div>
        <div><strong>CEP:</strong> ${escapeHtml(documentModel.empresa?.cep || 'Nao informado')}</div>
        <div><strong>FONE:</strong> ${escapeHtml(documentModel.empresa?.telefone || 'Nao informado')}</div>
        <div><strong>CNAE:</strong> ${escapeHtml(documentModel.empresa?.cnae || 'Nao informado')}</div>
        <div class="full"><strong>E-MAIL:</strong> ${escapeHtml(documentModel.empresa?.email || 'Nao informado')}</div>
      </div>

      <table class="simple-table workforce">
        <thead>
          <tr>
            <th colspan="3">COMPOSICAO DO QUADRO DE FUNCIONARIOS</th>
          </tr>
          <tr>
            <th></th>
            <th>Masculino</th>
            <th>Feminino</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Funcionarios por sexo</td>
            <td class="center">${escapeHtml(String(workforce.masculino))}</td>
            <td class="center">${escapeHtml(String(workforce.feminino))}</td>
          </tr>
          <tr>
            <td>Total de funcionarios</td>
            <td colspan="2" class="center">${escapeHtml(String(workforce.total || 0))}</td>
          </tr>
        </tbody>
      </table>

      <div class="responsible-block">
        <strong>RESPONSAVEL DA EMPRESA:</strong>
        <div>1. ${escapeHtml(documentModel.empresa?.responsavel || documentModel.empresa?.nome || 'Nao informado')}</div>
      </div>
    </section>
  `;
};

const renderEvaluators = (documentModel) => `
  <section class="section compact">
    <h2>2 - AVALIADORES</h2>
    <table class="simple-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Registro</th>
          <th>E-mail</th>
        </tr>
      </thead>
      <tbody>
        ${(documentModel.equipeTecnica || [])
          .map(
            (member) => `
              <tr>
                <td>${escapeHtml(member.nome || 'Nao informado')}</td>
                <td>${escapeHtml(member.registro || 'Nao informado')}</td>
                <td>${escapeHtml(member.email || 'Nao informado')}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  </section>
`;

const renderNarrativeSection = (title, paragraphs) => `
  <section class="section compact">
    <h2>${escapeHtml(title)}</h2>
    ${renderParagraphs(paragraphs)}
  </section>
`;

const renderRiskAssessment = (documentModel) => `
  <section class="section compact">
    <h2>7 - AVALIACAO DOS RISCOS</h2>
    ${renderParagraphs(getSectionParagraphs(documentModel, 'avaliacao_riscos'))}
    <p>Na avaliacao de cada risco ocupacional existente nos setores e funcoes do estabelecimento, utiliza-se matriz de risco documentada e criterios padronizados de severidade e probabilidade.</p>
  </section>
  <section class="section">
    <h2>8 - CRITERIOS UTILIZADOS PARA DEFINICAO DO NIVEL DO RISCO</h2>
    <table class="simple-table">
      <thead>
        <tr>
          <th colspan="3">Probabilidade</th>
        </tr>
        <tr>
          <th>Significado</th>
          <th>Peso</th>
          <th>Descricao</th>
        </tr>
      </thead>
      <tbody>
        ${renderStaticRows(PROBABILITY_ROWS)}
      </tbody>
    </table>
    <table class="simple-table top-gap">
      <thead>
        <tr>
          <th colspan="3">Efeito</th>
        </tr>
        <tr>
          <th>Significado</th>
          <th>Peso</th>
          <th>Descricao</th>
        </tr>
      </thead>
      <tbody>
        ${renderStaticRows(EFFECT_ROWS)}
      </tbody>
    </table>
    <table class="simple-table top-gap">
      <thead>
        <tr>
          <th colspan="2">Classificacao de prioridade</th>
        </tr>
      </thead>
      <tbody>
        ${PRIORITY_ROWS.map(
          (row) => `
            <tr>
              <td class="level-cell">${escapeHtml(row[0])}</td>
              <td>${escapeHtml(row[1])}</td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>
  </section>
`;

const renderMethodology = (documentModel) => `
  <section class="section compact">
    <h2>9 - INSTRUMENTO(S) UTILIZADO(S) NA AVALIACAO DOS RISCOS</h2>
    <p>${escapeHtml((documentModel.metodologia?.instrumentos || []).join(' | ') || 'Sem instrumentos cadastrados.')}</p>
  </section>
  <section class="section compact">
    <h2>10 - METODOLOGIA DE USO DO(S) INSTRUMENTO(S)</h2>
    <p>${escapeHtml((documentModel.metodologia?.metodologia || []).join(' | ') || 'Sem metodologia cadastrada.')}</p>
    <p><strong>Criterios:</strong> ${escapeHtml((documentModel.metodologia?.criterios || []).join(' | ') || 'Sem criterios cadastrados.')}</p>
    <p><strong>Matriz:</strong> ${escapeHtml((documentModel.metodologia?.matriz || []).join(' | ') || 'Sem matriz cadastrada.')}</p>
  </section>
  <section class="section compact">
    <h2>11 - ANTECIPACAO DOS RISCOS</h2>
    ${renderParagraphs(getSectionParagraphs(documentModel, 'antecipacao_riscos'))}
  </section>
`;

const renderRiskInventory = (documentModel) => `
  <section class="section">
    <h2>12 - INVENTARIO DE RISCOS</h2>
    <table class="inventory-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Setor</th>
          <th>Cargo</th>
          <th>Perigo</th>
          <th>Agente</th>
          <th>Fonte</th>
          <th>Dano</th>
          <th>P</th>
          <th>S</th>
          <th>Nivel</th>
          <th>Controles</th>
          <th>Plano de acao</th>
        </tr>
      </thead>
      <tbody>
        ${(documentModel.quadroRiscos || [])
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(String(row.ordem || ''))}</td>
                <td>${escapeHtml(row.setor || '')}</td>
                <td>${escapeHtml(row.cargo || '')}</td>
                <td>${escapeHtml(row.perigo || '')}</td>
                <td>${escapeHtml(row.agente || '')}</td>
                <td>${escapeHtml(row.fonte || '')}</td>
                <td>${escapeHtml(row.dano || '')}</td>
                <td class="center">${escapeHtml(String(row.probabilidade || ''))}</td>
                <td class="center">${escapeHtml(String(row.severidade || ''))}</td>
                <td>${escapeHtml(row.nivel || '')}</td>
                <td>${escapeHtml(row.controles || '')}</td>
                <td>${escapeHtml(row.acoes || '')}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  </section>
`;

const renderRiskSheets = (documentModel) => `
  <section class="section">
    <h2>13 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO</h2>
    ${(documentModel.fichasRiscosPgr || [])
      .map(
        (risk) => `
          <article class="risk-sheet">
            <table class="sheet-table">
              <tbody>
                <tr>
                  <td class="label">Sugestao(oes) iniciais</td>
                  <td>${escapeHtml(risk.sugestoesIniciais || 'Sem controles registrados')}</td>
                </tr>
                <tr>
                  <td class="label">Riscos (Possiveis danos a saude)</td>
                  <td>${escapeHtml(risk.danosSaude || 'Nao informado')}</td>
                </tr>
                <tr class="sheet-title-row">
                  <td colspan="2">${escapeHtml(risk.perigo || 'Perigo nao informado')}</td>
                </tr>
                <tr>
                  <td class="label">Setor(es)</td>
                  <td>${escapeHtml(risk.setor || 'Nao informado')}</td>
                </tr>
                <tr>
                  <td class="label">Cargo(s)</td>
                  <td>${escapeHtml(risk.cargo || 'Nao informado')}</td>
                </tr>
                <tr>
                  <td class="label">Descricao</td>
                  <td>${escapeHtml(risk.descricao || 'Sem descricao complementar.')}</td>
                </tr>
                <tr>
                  <td class="label">Agente</td>
                  <td>${escapeHtml(risk.agente || 'Nao informado')}</td>
                </tr>
                <tr>
                  <td class="label">Fonte geradora</td>
                  <td>${escapeHtml(risk.fonte || 'Nao informado')}</td>
                </tr>
                <tr>
                  <td class="label">Plano de acao</td>
                  <td>${escapeHtml(risk.planoAcao || 'Sem plano de acao')}</td>
                </tr>
                <tr>
                  <td class="label">Classificacao</td>
                  <td>P ${escapeHtml(String(risk.probabilidade || ''))} / S ${escapeHtml(String(risk.severidade || ''))} / Nivel ${escapeHtml(risk.nivel || '')}</td>
                </tr>
              </tbody>
            </table>
          </article>
        `
      )
      .join('')}
  </section>
`;

const renderActionPlanSection = (documentModel) => `
  <section class="section">
    <h2>14 - METAS E PRIORIDADES DE CONTROLE</h2>
    <table class="simple-table">
      <thead>
        <tr>
          <th>Acao</th>
          <th>Responsavel</th>
          <th>Status</th>
          <th>Setor/Cargo</th>
          <th>Risco vinculado</th>
        </tr>
      </thead>
      <tbody>
        ${(documentModel.planoAcao || [])
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.title || 'Nao informado')}</td>
                <td>${escapeHtml(item.responsible || 'Nao informado')}</td>
                <td>${escapeHtml(item.status || 'Nao informado')}</td>
                <td>${escapeHtml(`${item.sector || 'Nao informado'} / ${item.role || 'Nao informado'}`)}</td>
                <td>${escapeHtml(item.hazard || 'Nao informado')}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  </section>
`;

const renderClosing = (documentModel) => `
  <section class="section compact">
    <h2>15 - REGISTRO E DIVULGACAO DOS DADOS</h2>
    ${renderParagraphs(getSectionParagraphs(documentModel, 'registro_divulgacao_dados'))}
  </section>
  <section class="section compact">
    <h2>16 - RECOMENDACOES A EMPRESA</h2>
    ${renderParagraphs(getSectionParagraphs(documentModel, 'recomendacoes_empresa'))}
  </section>
  <section class="section compact">
    <h2>17 - CONSIDERACOES FINAIS</h2>
    ${renderParagraphs(getSectionParagraphs(documentModel, 'consideracoes_finais'))}
  </section>
  <section class="section compact">
    <h2>18 - ENCERRAMENTO</h2>
    <p>${escapeHtml(documentModel.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
    <div class="signature-block">
      <div><strong>Responsavel tecnico:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</div>
      <div><strong>Registro:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</div>
      <div><strong>Emitido em:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.emitidoEm || 'Nao informado')}</div>
      <div><strong>Hash documental:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.hash || 'n/a')}</div>
    </div>
  </section>
`;

const renderPgrHtml = (documentModel) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentModel.documento?.titulo || 'PGR')}</title>
    <style>
      @page { size: A4; margin: 92px 34px 76px 34px; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; background: #fff; }
      p { margin: 0 0 10px; }
      .cover { min-height: calc(100vh - 168px); text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 24px 0 18px; page-break-after: always; }
      .brand-block { margin-top: 10px; }
      .brand-name { font-size: 40px; font-weight: 700; letter-spacing: 0.02em; color: #6d7178; }
      .brand-caption { font-size: 8px; color: #7f8790; margin-top: 2px; letter-spacing: 0.05em; }
      .cover-company { font-size: 22px; margin-top: 18px; max-width: 560px; text-transform: uppercase; }
      .cover-code { font-size: 58px; font-weight: 700; margin-top: 110px; }
      .cover-title { font-size: 20px; font-weight: 700; margin-top: 24px; }
      .cover-normative { font-size: 18px; margin-top: 86px; }
      .cover-dates { font-size: 14px; margin-top: 78px; }
      .section { page-break-before: always; }
      .compact { page-break-inside: avoid; }
      h2 { margin: 0 0 18px; font-size: 18px; font-weight: 700; text-transform: uppercase; }
      .toc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 11px; font-weight: 700; }
      .toc-label { white-space: nowrap; }
      .toc-dots { flex: 1; border-bottom: 1px dotted #666; }
      .toc-page { width: 26px; text-align: right; }
      .label-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 22px; margin-bottom: 18px; }
      .label-grid .full { grid-column: 1 / -1; }
      table { width: 100%; border-collapse: collapse; }
      .meta-table td, .simple-table td, .simple-table th, .inventory-table td, .inventory-table th, .sheet-table td { border: 1px solid #dddddd; padding: 6px 7px; vertical-align: top; }
      .simple-table th, .inventory-table th { background: #f1f1f1; font-size: 10px; font-weight: 700; }
      .inventory-table { table-layout: fixed; }
      .inventory-table th, .inventory-table td { font-size: 8.4px; }
      .meta-table td:first-child, .meta-table td:nth-child(3) { width: 18%; background: #f7f7f7; font-weight: 700; }
      .workforce { margin-top: 18px; }
      .workforce th[colspan="3"] { text-align: center; }
      .responsible-block { margin-top: 22px; }
      .center { text-align: center; }
      .top-gap { margin-top: 12px; }
      .level-cell { width: 110px; font-weight: 700; }
      .risk-sheet { break-inside: avoid; margin-bottom: 14px; }
      .sheet-table .label { width: 190px; background: #f7f7f7; font-weight: 700; }
      .sheet-title-row td { background: #ececec; font-weight: 700; font-size: 13px; }
      .signature-block { margin-top: 24px; }
      .header { width: 100%; font-size: 8px; color: #444; padding: 0 8px; }
      .header-inner { width: 100%; display: flex; align-items: center; justify-content: space-between; }
      .header-brand { text-align: center; width: 100%; font-weight: 700; color: #6d7178; }
      .header-page { width: 42px; text-align: right; }
      .footer { width: 100%; font-size: 8px; color: #333; padding: 0 8px; }
      .footer-inner { text-align: center; width: 100%; font-weight: 700; }
      .footer-inner small { display: block; font-weight: 400; font-size: 8px; }
    </style>
  </head>
  <body>
    ${renderCover(documentModel)}
    <section class="section compact">
      <h2>SUMARIO</h2>
      ${renderTableOfContents(documentModel)}
    </section>
    ${renderIssueFrame(documentModel)}
    ${renderIdentification(documentModel)}
    ${renderEvaluators(documentModel)}
    ${renderNarrativeSection('3 - APRESENTACAO', getSectionParagraphs(documentModel, 'apresentacao'))}
    ${renderNarrativeSection('4 - OBJETIVOS', getSectionParagraphs(documentModel, 'objetivos'))}
    ${renderNarrativeSection('5 - CONSIDERACOES PRELIMINARES', getSectionParagraphs(documentModel, 'consideracoes_preliminares'))}
    ${renderNarrativeSection('6 - AREA DE ABRANGENCIA DO PGR NA EMPRESA', getSectionParagraphs(documentModel, 'area_abrangencia'))}
    ${renderRiskAssessment(documentModel)}
    ${renderMethodology(documentModel)}
    ${renderRiskInventory(documentModel)}
    ${renderRiskSheets(documentModel)}
    ${renderActionPlanSection(documentModel)}
    ${renderClosing(documentModel)}
  </body>
</html>`;

const renderPgrHeader = (documentModel) => `
  <div class="header">
    <div class="header-inner">
      <div class="header-brand">${escapeHtml(documentModel.identidadeVisual?.brandName || 'CEST')}</div>
      <div class="header-page"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  </div>
`;

const renderPgrFooter = (documentModel) => `
  <div class="footer">
    <div class="footer-inner">
      ${escapeHtml(documentModel.identidadeVisual?.brandName || 'SST SaaS')}
      <small>${escapeHtml(documentModel.empresa?.endereco || '')} ${escapeHtml(documentModel.empresa?.cidade || '')} - ${escapeHtml(documentModel.empresa?.estado || '')}</small>
      <small>Telefone: ${escapeHtml(documentModel.empresa?.telefone || 'Nao informado')} E-mail: ${escapeHtml(documentModel.empresa?.email || 'Nao informado')}</small>
    </div>
  </div>
`;

module.exports = {
  meta: {
    type: 'pgr',
    title: 'Template formal PGR'
  },
  render: async ({ documentModel }) => ({
    html: renderPgrHtml(documentModel),
    headerTemplate: renderPgrHeader(documentModel),
    footerTemplate: renderPgrFooter(documentModel),
    pdfOptions: {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '92px',
        right: '34px',
        bottom: '76px',
        left: '34px'
      }
    }
  })
};
