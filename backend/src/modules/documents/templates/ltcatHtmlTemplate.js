const { escapeHtml } = require('./templateUtils');

const getSectionParagraphs = (documentModel, key) =>
  documentModel.secoes?.find((s) => s.chave === key)?.paragrafos || [];

const renderParagraphs = (paragraphs = []) =>
  paragraphs.length ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('') : '<p>Sem dados disponiveis.</p>';

const renderCover = (dm) => `
  <section class="cover">
    <div class="brand-block">
      <div class="brand-name">${escapeHtml(dm.identidadeVisual?.brandName || 'CEST')}</div>
      <div class="brand-caption">CONSULTORIA TECNICA EM SEGURANCA E SAUDE DO TRABALHO</div>
    </div>
    <div class="cover-company">${escapeHtml(dm.empresa?.nome || 'Nao informado')}</div>
    <div class="cover-code">LTCAT</div>
    <div class="cover-title">${escapeHtml(dm.documento?.tituloFormal || 'Laudo Tecnico das Condicoes Ambientais de Trabalho')}</div>
    <div class="cover-normative">Decreto 3.048/99 — Art. 68</div>
    <div class="cover-dates">${escapeHtml(dm.documento?.vigencia || 'Sem vigencia informada')}</div>
  </section>
`;

const renderToc = (dm) => {
  const sections = (dm.secoes || []).filter((s) => s.titulo);
  if (!sections.length) {
    const defaults = [
      '1 - IDENTIFICACAO DA EMPRESA', '2 - AVALIADORES', '3 - INTRODUCAO',
      '4 - ELEMENTOS CONSTRUTIVOS DO LTCAT', '5 - LEGISLACAO TRABALHISTA',
      '6 - LEGISLACAO PREVIDENCIARIA', '7 - INICIAIS',
      '8 - CRITERIOS DAS AVALIACOES', '9 - METODOLOGIA DAS AVALIACOES',
      '10 - EQUIPAMENTOS UTILIZADOS',
      '11 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO',
      '12 - NOTA TECNICA', '13 - CONCLUSAO', '14 - CONSIDERACOES FINAIS',
      '15 - ENCERRAMENTO', '16 - REFERENCIAS BIBLIOGRAFICAS'
    ];
    return defaults.map((t) => `<div class="toc-row"><span class="toc-label">${escapeHtml(t)}</span><span class="toc-dots"></span></div>`).join('');
  }
  return sections.map((s) => `<div class="toc-row"><span class="toc-label">${escapeHtml(s.titulo)}</span><span class="toc-dots"></span></div>`).join('');
};

const renderIssueFrame = (dm) => `
  <section class="section compact">
    <h2>CONTROLE DE EMISSAO</h2>
    <table class="meta-table">
      <tbody>
        <tr>
          <td><strong>Documento</strong></td>
          <td>${escapeHtml(dm.emissao?.tipo || 'LTCAT')}</td>
          <td><strong>Empresa</strong></td>
          <td>${escapeHtml(dm.emissao?.empresa || 'Nao informado')}</td>
        </tr>
        <tr>
          <td><strong>Vigencia</strong></td>
          <td>${escapeHtml(dm.emissao?.vigencia || 'Nao informado')}</td>
          <td><strong>Versao</strong></td>
          <td>v${escapeHtml(String(dm.emissao?.versao || 1))}</td>
        </tr>
        <tr>
          <td><strong>Emitido em</strong></td>
          <td>${escapeHtml(dm.emissao?.emitidoEm || 'Nao informado')}</td>
          <td><strong>Hash</strong></td>
          <td>${escapeHtml(dm.emissao?.hash || 'n/a')}</td>
        </tr>
        <tr>
          <td><strong>Responsavel tecnico</strong></td>
          <td>${escapeHtml(dm.emissao?.responsavelTecnico || 'Nao informado')}</td>
          <td><strong>Registro</strong></td>
          <td>${escapeHtml(dm.emissao?.registroResponsavel || 'Nao informado')}</td>
        </tr>
      </tbody>
    </table>
  </section>
`;

const renderIdentification = (dm) => `
  <section class="section">
    <h2>1 - IDENTIFICACAO DA EMPRESA</h2>
    <div class="label-grid">
      <div><strong>RAZAO SOCIAL:</strong> ${escapeHtml(dm.empresa?.nome || 'Nao informado')}</div>
      <div><strong>CNPJ:</strong> ${escapeHtml(dm.empresa?.cnpj || 'Nao informado')}</div>
      <div><strong>ENDERECO:</strong> ${escapeHtml(dm.empresa?.endereco || 'Nao informado')}</div>
      <div><strong>CIDADE:</strong> ${escapeHtml(dm.empresa?.cidade || 'Nao informado')}</div>
      <div><strong>ESTADO:</strong> ${escapeHtml(dm.empresa?.estado || 'Nao informado')}</div>
      <div><strong>CEP:</strong> ${escapeHtml(dm.empresa?.cep || 'Nao informado')}</div>
      <div><strong>FONE:</strong> ${escapeHtml(dm.empresa?.telefone || 'Nao informado')}</div>
      <div><strong>CNAE:</strong> ${escapeHtml(dm.empresa?.cnae || 'Nao informado')}</div>
      <div class="full"><strong>E-MAIL:</strong> ${escapeHtml(dm.empresa?.email || 'Nao informado')}</div>
    </div>
  </section>
`;

const renderEvaluators = (dm) => `
  <section class="section compact">
    <h2>2 - AVALIADORES</h2>
    <table class="simple-table">
      <thead><tr><th>Nome</th><th>Registro</th><th>E-mail</th></tr></thead>
      <tbody>
        ${(dm.equipeTecnica || []).map((m) => `
          <tr>
            <td>${escapeHtml(m.nome || 'Nao informado')}</td>
            <td>${escapeHtml(m.registro || 'Nao informado')}</td>
            <td>${escapeHtml(m.email || 'Nao informado')}</td>
          </tr>
        `).join('')}
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

const renderMethodology = (dm) => `
  <section class="section compact">
    <h2>8 - CRITERIOS DAS AVALIACOES</h2>
    <p>${escapeHtml((dm.metodologia?.criterios || []).join(' | ') || 'Sem criterios cadastrados.')}</p>
    ${renderParagraphs(getSectionParagraphs(dm, 'criterios_avaliacoes'))}
  </section>
  <section class="section compact">
    <h2>9 - METODOLOGIA DAS AVALIACOES</h2>
    <p>${escapeHtml((dm.metodologia?.metodologia || []).join(' | ') || 'Sem metodologia cadastrada.')}</p>
    ${renderParagraphs(getSectionParagraphs(dm, 'metodologia_avaliacoes'))}
  </section>
  <section class="section compact">
    <h2>10 - EQUIPAMENTOS UTILIZADOS</h2>
    <p>${escapeHtml((dm.metodologia?.instrumentos || []).join(' | ') || 'Sem instrumentos cadastrados.')}</p>
    ${renderParagraphs(getSectionParagraphs(dm, 'equipamentos_utilizados'))}
  </section>
`;

const LEVEL_COLORS = { critico: '#dc2626', alto: '#ea580c', moderado: '#ca8a04', toleravel: '#16a34a' };

const renderRiskAnalysis = (dm) => `
  <section class="section">
    <h2>11 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'analise_riscos_ambiente_trabalho'))}
    <table class="inventory-table">
      <thead>
        <tr>
          <th>#</th><th>Setor</th><th>Cargo</th><th>Agente</th><th>Fonte</th>
          <th>Exposicao</th><th>Dano</th><th>P</th><th>S</th><th>Nivel</th><th>Controles</th>
        </tr>
      </thead>
      <tbody>
        ${(dm.quadroRiscos || []).map((r) => `
          <tr>
            <td>${escapeHtml(String(r.ordem || ''))}</td>
            <td>${escapeHtml(r.setor || '')}</td>
            <td>${escapeHtml(r.cargo || '')}</td>
            <td>${escapeHtml(r.agente || '')}</td>
            <td>${escapeHtml(r.fonte || '')}</td>
            <td>${escapeHtml(r.exposicao || '')}</td>
            <td>${escapeHtml(r.dano || '')}</td>
            <td class="center">${escapeHtml(String(r.probabilidade || ''))}</td>
            <td class="center">${escapeHtml(String(r.severidade || ''))}</td>
            <td style="color:${LEVEL_COLORS[r.nivel] || '#333'};font-weight:700">${escapeHtml(r.nivel || '')}</td>
            <td>${escapeHtml(r.controles || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
`;

const renderConclusion = (dm) => `
  <section class="section compact">
    <h2>12 - NOTA TECNICA</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'nota_tecnica'))}
  </section>
  <section class="section compact">
    <h2>13 - CONCLUSAO</h2>
    ${(dm.conclusoes || []).map((c) => `
      <div class="conclusion-block">
        <p><strong>Avaliacao:</strong> ${escapeHtml(c.avaliacao || '')}</p>
        <p><strong>Resultado:</strong> ${escapeHtml(c.resultado || 'Nao informado')}</p>
        <p><strong>Base tecnica:</strong> ${escapeHtml(c.base || 'Nao informado')}</p>
        <p><strong>Enquadramento normativo:</strong> ${escapeHtml(c.enquadramentoNormativo || 'Nao informado')}</p>
      </div>
    `).join('') || '<p>Sem conclusoes disponiveis.</p>'}
  </section>
`;

const renderClosing = (dm) => `
  <section class="section compact">
    <h2>14 - CONSIDERACOES FINAIS</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'consideracoes_finais'))}
  </section>
  <section class="section compact">
    <h2>15 - ENCERRAMENTO</h2>
    <p>${escapeHtml(dm.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
    <div class="signature-block">
      <div><strong>Responsavel tecnico:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</div>
      <div><strong>Registro:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</div>
      <div><strong>Emitido em:</strong> ${escapeHtml(dm.fechamentoTecnico?.emitidoEm || 'Nao informado')}</div>
      <div><strong>Hash documental:</strong> ${escapeHtml(dm.fechamentoTecnico?.hash || 'n/a')}</div>
    </div>
  </section>
  <section class="section compact">
    <h2>16 - REFERENCIAS BIBLIOGRAFICAS</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'referencias_bibliograficas'))}
  </section>
`;

const renderLtcatHtml = (dm) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(dm.documento?.titulo || 'LTCAT')}</title>
    <style>
      @page { size: A4; margin: 92px 34px 76px 34px; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; background: #fff; }
      p { margin: 0 0 10px; }
      .cover { min-height: calc(100vh - 168px); text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 24px 0 18px; page-break-after: always; }
      .brand-block { margin-top: 10px; }
      .brand-name { font-size: 40px; font-weight: 700; letter-spacing: 0.02em; color: #0f4c81; }
      .brand-caption { font-size: 8px; color: #5a7fa0; margin-top: 2px; letter-spacing: 0.05em; }
      .cover-company { font-size: 22px; margin-top: 18px; max-width: 560px; text-transform: uppercase; }
      .cover-code { font-size: 58px; font-weight: 700; margin-top: 110px; color: #0f4c81; }
      .cover-title { font-size: 20px; font-weight: 700; margin-top: 24px; }
      .cover-normative { font-size: 18px; margin-top: 86px; color: #0f4c81; }
      .cover-dates { font-size: 14px; margin-top: 78px; }
      .section { page-break-before: always; }
      .compact { page-break-inside: avoid; }
      h2 { margin: 0 0 18px; font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f4c81; }
      .toc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 11px; font-weight: 700; }
      .toc-label { white-space: nowrap; }
      .toc-dots { flex: 1; border-bottom: 1px dotted #666; }
      .label-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 22px; margin-bottom: 18px; }
      .label-grid .full { grid-column: 1 / -1; }
      table { width: 100%; border-collapse: collapse; }
      .meta-table td, .simple-table td, .simple-table th, .inventory-table td, .inventory-table th { border: 1px solid #c8d6e5; padding: 6px 7px; vertical-align: top; }
      .simple-table th, .inventory-table th { background: #e8f0f8; font-size: 10px; font-weight: 700; color: #0f4c81; }
      .inventory-table { table-layout: fixed; }
      .inventory-table th, .inventory-table td { font-size: 8.4px; }
      .meta-table td:first-child, .meta-table td:nth-child(3) { width: 18%; background: #e8f0f8; font-weight: 700; color: #0f4c81; }
      .center { text-align: center; }
      .conclusion-block { margin-bottom: 14px; padding: 10px; border-left: 3px solid #0f4c81; background: #f5f9ff; }
      .signature-block { margin-top: 24px; }
      .header { width: 100%; font-size: 8px; color: #444; padding: 0 8px; }
      .header-inner { width: 100%; display: flex; align-items: center; justify-content: space-between; }
      .header-brand { text-align: center; width: 100%; font-weight: 700; color: #0f4c81; }
      .header-page { width: 42px; text-align: right; }
      .footer { width: 100%; font-size: 8px; color: #333; padding: 0 8px; }
      .footer-inner { text-align: center; width: 100%; font-weight: 700; }
      .footer-inner small { display: block; font-weight: 400; font-size: 8px; }
    </style>
  </head>
  <body>
    ${renderCover(dm)}
    <section class="section compact">
      <h2>SUMARIO</h2>
      ${renderToc(dm)}
    </section>
    ${renderIssueFrame(dm)}
    ${renderIdentification(dm)}
    ${renderEvaluators(dm)}
    ${renderNarrativeSection('3 - INTRODUCAO', getSectionParagraphs(dm, 'introducao'))}
    ${renderNarrativeSection('4 - ELEMENTOS CONSTRUTIVOS DO LTCAT', getSectionParagraphs(dm, 'elementos_construtivos_ltcat'))}
    ${renderNarrativeSection('5 - LEGISLACAO TRABALHISTA', getSectionParagraphs(dm, 'legislacao_trabalhista'))}
    ${renderNarrativeSection('6 - LEGISLACAO PREVIDENCIARIA', getSectionParagraphs(dm, 'legislacao_previdenciaria'))}
    ${renderNarrativeSection('7 - INICIAIS', getSectionParagraphs(dm, 'iniciais'))}
    ${renderMethodology(dm)}
    ${renderRiskAnalysis(dm)}
    ${renderConclusion(dm)}
    ${renderClosing(dm)}
  </body>
</html>`;

const renderLtcatHeader = (dm) => `
  <div class="header">
    <div class="header-inner">
      <div class="header-brand">${escapeHtml(dm.identidadeVisual?.brandName || 'CEST')} — LTCAT</div>
      <div class="header-page"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  </div>
`;

const renderLtcatFooter = (dm) => `
  <div class="footer">
    <div class="footer-inner">
      ${escapeHtml(dm.identidadeVisual?.brandName || 'SST SaaS')}
      <small>${escapeHtml(dm.empresa?.endereco || '')} ${escapeHtml(dm.empresa?.cidade || '')} - ${escapeHtml(dm.empresa?.estado || '')}</small>
      <small>Telefone: ${escapeHtml(dm.empresa?.telefone || 'Nao informado')} E-mail: ${escapeHtml(dm.empresa?.email || 'Nao informado')}</small>
    </div>
  </div>
`;

module.exports = {
  meta: { type: 'ltcat', title: 'Template formal LTCAT' },
  render: async ({ documentModel }) => ({
    html: renderLtcatHtml(documentModel),
    headerTemplate: renderLtcatHeader(documentModel),
    footerTemplate: renderLtcatFooter(documentModel),
    pdfOptions: {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '92px', right: '34px', bottom: '76px', left: '34px' }
    }
  })
};
