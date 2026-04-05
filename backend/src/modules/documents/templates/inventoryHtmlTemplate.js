const { escapeHtml } = require('./templateUtils');

const LEVEL_COLORS = { critico: '#dc2626', alto: '#ea580c', moderado: '#ca8a04', toleravel: '#16a34a' };
const LEVEL_BG = { critico: '#fef2f2', alto: '#fff7ed', moderado: '#fefce8', toleravel: '#f0fdf4' };

const getSectionParagraphs = (dm, key) =>
  dm.secoes?.find((s) => s.chave === key)?.paragrafos || [];

const renderParagraphs = (paragraphs = []) =>
  paragraphs.length ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('') : '<p>Sem dados disponiveis.</p>';

const renderCover = (dm) => `
  <section class="cover">
    <div class="brand-block">
      <div class="brand-name">${escapeHtml(dm.identidadeVisual?.brandName || 'CEST')}</div>
      <div class="brand-caption">CONSULTORIA TECNICA EM SEGURANCA E SAUDE DO TRABALHO</div>
    </div>
    <div class="cover-company">${escapeHtml(dm.empresa?.nome || 'Nao informado')}</div>
    <div class="cover-code">INVENTARIO</div>
    <div class="cover-title">${escapeHtml(dm.documento?.tituloFormal || 'Inventario de Riscos Ocupacionais')}</div>
    <div class="cover-dates">${escapeHtml(dm.documento?.vigencia || 'Sem vigencia informada')}</div>
  </section>
`;

const buildLevelSummary = (dm) => {
  const risks = dm.quadroRiscos || [];
  return {
    total: risks.length,
    critico: risks.filter((r) => r.nivel === 'critico').length,
    alto: risks.filter((r) => r.nivel === 'alto').length,
    moderado: risks.filter((r) => r.nivel === 'moderado').length,
    toleravel: risks.filter((r) => r.nivel === 'toleravel').length
  };
};

const renderIndicators = (dm) => {
  const s = buildLevelSummary(dm);
  const card = (label, count, color, bg) =>
    `<div class="indicator-card" style="border-left:4px solid ${color};background:${bg}">
      <div class="indicator-value" style="color:${color}">${count}</div>
      <div class="indicator-label">${label}</div>
    </div>`;
  return `
    <div class="indicators">
      ${card('Critico', s.critico, LEVEL_COLORS.critico, LEVEL_BG.critico)}
      ${card('Alto', s.alto, LEVEL_COLORS.alto, LEVEL_BG.alto)}
      ${card('Moderado', s.moderado, LEVEL_COLORS.moderado, LEVEL_BG.moderado)}
      ${card('Toleravel', s.toleravel, LEVEL_COLORS.toleravel, LEVEL_BG.toleravel)}
    </div>
    <p style="margin-top:8px"><strong>Total de riscos inventariados:</strong> ${s.total}</p>
  `;
};

const renderIssueFrame = (dm) => `
  <section class="section compact">
    <h2>CONTROLE DE EMISSAO</h2>
    <table class="meta-table">
      <tbody>
        <tr>
          <td><strong>Documento</strong></td><td>${escapeHtml(dm.emissao?.tipo || 'Inventario')}</td>
          <td><strong>Empresa</strong></td><td>${escapeHtml(dm.emissao?.empresa || 'Nao informado')}</td>
        </tr>
        <tr>
          <td><strong>Vigencia</strong></td><td>${escapeHtml(dm.emissao?.vigencia || 'Nao informado')}</td>
          <td><strong>Versao</strong></td><td>v${escapeHtml(String(dm.emissao?.versao || 1))}</td>
        </tr>
        <tr>
          <td><strong>Emitido em</strong></td><td>${escapeHtml(dm.emissao?.emitidoEm || 'Nao informado')}</td>
          <td><strong>Hash</strong></td><td>${escapeHtml(dm.emissao?.hash || 'n/a')}</td>
        </tr>
        <tr>
          <td><strong>Responsavel tecnico</strong></td><td>${escapeHtml(dm.emissao?.responsavelTecnico || 'Nao informado')}</td>
          <td><strong>Registro</strong></td><td>${escapeHtml(dm.emissao?.registroResponsavel || 'Nao informado')}</td>
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

const renderInventoryTable = (dm) => `
  <section class="section">
    <h2>2 - INVENTARIO DE RISCOS</h2>
    ${renderIndicators(dm)}
    <table class="inventory-table">
      <thead>
        <tr>
          <th>#</th><th>Setor</th><th>Cargo</th><th>Perigo</th><th>Fator</th>
          <th>Agente</th><th>Fonte</th><th>Dano</th><th>P</th><th>S</th><th>Nivel</th><th>Controles</th>
        </tr>
      </thead>
      <tbody>
        ${(dm.quadroRiscos || []).map((r) => `
          <tr>
            <td>${escapeHtml(String(r.ordem || ''))}</td>
            <td>${escapeHtml(r.setor || '')}</td>
            <td>${escapeHtml(r.cargo || '')}</td>
            <td>${escapeHtml(r.perigo || '')}</td>
            <td>${escapeHtml(r.fator || '')}</td>
            <td>${escapeHtml(r.agente || '')}</td>
            <td>${escapeHtml(r.fonte || '')}</td>
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

const renderActionPlan = (dm) => `
  <section class="section">
    <h2>3 - PLANO DE ACAO</h2>
    <table class="simple-table">
      <thead>
        <tr><th>Acao</th><th>Responsavel</th><th>Status</th><th>Setor/Cargo</th><th>Risco vinculado</th></tr>
      </thead>
      <tbody>
        ${(dm.planoAcao || []).map((item) => `
          <tr>
            <td>${escapeHtml(item.title || 'Nao informado')}</td>
            <td>${escapeHtml(item.responsible || 'Nao informado')}</td>
            <td>${escapeHtml(item.status || 'Nao informado')}</td>
            <td>${escapeHtml(`${item.sector || ''} / ${item.role || ''}`)}</td>
            <td>${escapeHtml(item.hazard || 'Nao informado')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
`;

const renderClosing = (dm) => `
  <section class="section compact">
    <h2>4 - ENCERRAMENTO</h2>
    <p>${escapeHtml(dm.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
    <div class="signature-block">
      <div><strong>Responsavel tecnico:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</div>
      <div><strong>Registro:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</div>
      <div><strong>Emitido em:</strong> ${escapeHtml(dm.fechamentoTecnico?.emitidoEm || 'Nao informado')}</div>
      <div><strong>Hash documental:</strong> ${escapeHtml(dm.fechamentoTecnico?.hash || 'n/a')}</div>
    </div>
  </section>
`;

const renderInventoryHtml = (dm) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(dm.documento?.titulo || 'Inventario de Riscos')}</title>
    <style>
      @page { size: A4; margin: 92px 34px 76px 34px; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; background: #fff; }
      p { margin: 0 0 10px; }
      .cover { min-height: calc(100vh - 168px); text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 24px 0 18px; page-break-after: always; }
      .brand-block { margin-top: 10px; }
      .brand-name { font-size: 40px; font-weight: 700; letter-spacing: 0.02em; color: #7c3aed; }
      .brand-caption { font-size: 8px; color: #8b5cf6; margin-top: 2px; letter-spacing: 0.05em; }
      .cover-company { font-size: 22px; margin-top: 18px; max-width: 560px; text-transform: uppercase; }
      .cover-code { font-size: 52px; font-weight: 700; margin-top: 110px; color: #7c3aed; }
      .cover-title { font-size: 20px; font-weight: 700; margin-top: 24px; }
      .cover-dates { font-size: 14px; margin-top: 78px; }
      .section { page-break-before: always; }
      .compact { page-break-inside: avoid; }
      h2 { margin: 0 0 18px; font-size: 18px; font-weight: 700; text-transform: uppercase; color: #7c3aed; }
      .label-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 22px; margin-bottom: 18px; }
      .label-grid .full { grid-column: 1 / -1; }
      table { width: 100%; border-collapse: collapse; }
      .meta-table td, .simple-table td, .simple-table th, .inventory-table td, .inventory-table th { border: 1px solid #d4c4f0; padding: 6px 7px; vertical-align: top; }
      .simple-table th, .inventory-table th { background: #f3e8ff; font-size: 10px; font-weight: 700; color: #7c3aed; }
      .inventory-table { table-layout: fixed; }
      .inventory-table th, .inventory-table td { font-size: 8.4px; }
      .meta-table td:first-child, .meta-table td:nth-child(3) { width: 18%; background: #f3e8ff; font-weight: 700; color: #7c3aed; }
      .center { text-align: center; }
      .indicators { display: flex; gap: 12px; margin-bottom: 12px; }
      .indicator-card { padding: 10px 14px; border-radius: 6px; min-width: 100px; }
      .indicator-value { font-size: 28px; font-weight: 700; }
      .indicator-label { font-size: 10px; font-weight: 600; margin-top: 2px; }
      .signature-block { margin-top: 24px; }
      .header { width: 100%; font-size: 8px; color: #444; padding: 0 8px; }
      .header-inner { width: 100%; display: flex; align-items: center; justify-content: space-between; }
      .header-brand { text-align: center; width: 100%; font-weight: 700; color: #7c3aed; }
      .header-page { width: 42px; text-align: right; }
      .footer { width: 100%; font-size: 8px; color: #333; padding: 0 8px; }
      .footer-inner { text-align: center; width: 100%; font-weight: 700; }
      .footer-inner small { display: block; font-weight: 400; font-size: 8px; }
    </style>
  </head>
  <body>
    ${renderCover(dm)}
    ${renderIssueFrame(dm)}
    ${renderIdentification(dm)}
    ${renderInventoryTable(dm)}
    ${renderActionPlan(dm)}
    ${renderClosing(dm)}
  </body>
</html>`;

const renderHeader = (dm) => `
  <div class="header">
    <div class="header-inner">
      <div class="header-brand">${escapeHtml(dm.identidadeVisual?.brandName || 'CEST')} — INVENTARIO DE RISCOS</div>
      <div class="header-page"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  </div>
`;

const renderFooter = (dm) => `
  <div class="footer">
    <div class="footer-inner">
      ${escapeHtml(dm.identidadeVisual?.brandName || 'SST SaaS')}
      <small>${escapeHtml(dm.empresa?.endereco || '')} ${escapeHtml(dm.empresa?.cidade || '')} - ${escapeHtml(dm.empresa?.estado || '')}</small>
    </div>
  </div>
`;

module.exports = {
  meta: { type: 'inventario', title: 'Template formal Inventario de Riscos' },
  render: async ({ documentModel }) => ({
    html: renderInventoryHtml(documentModel),
    headerTemplate: renderHeader(documentModel),
    footerTemplate: renderFooter(documentModel),
    pdfOptions: {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '92px', right: '34px', bottom: '76px', left: '34px' }
    }
  })
};
