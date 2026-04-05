const { escapeHtml } = require('./templateUtils');

const LEVEL_COLORS = { critico: '#dc2626', alto: '#ea580c', moderado: '#ca8a04', toleravel: '#16a34a' };

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
    <div class="cover-code">OS</div>
    <div class="cover-title">${escapeHtml(dm.documento?.tituloFormal || 'Ordem de Servico de Seguranca e Saude no Trabalho')}</div>
    <div class="cover-normative">NR-01 — Item 1.4.1</div>
    <div class="cover-dates">${escapeHtml(dm.documento?.vigencia || 'Sem vigencia informada')}</div>
  </section>
`;

const renderIssueFrame = (dm) => `
  <section class="section compact">
    <h2>CONTROLE DE EMISSAO</h2>
    <table class="meta-table">
      <tbody>
        <tr>
          <td><strong>Documento</strong></td><td>${escapeHtml(dm.emissao?.tipo || 'Ordem de Servico')}</td>
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

const renderScope = (dm) => `
  <section class="section compact">
    <h2>2 - ESCOPO E ABRANGENCIA</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'area_abrangencia'))}
    <table class="simple-table">
      <thead>
        <tr><th>Estabelecimento</th><th>Setor</th><th>Cargo</th><th>Atividades</th><th>Expostos</th></tr>
      </thead>
      <tbody>
        ${(dm.raw?.assessmentScope || []).map((s) => `
          <tr>
            <td>${escapeHtml(s.establishment || '')}</td>
            <td>${escapeHtml(s.sector || '')}</td>
            <td>${escapeHtml(s.role || '')}</td>
            <td>${escapeHtml((s.context?.atividadesBase || []).join(', ') || 'Nao informado')}</td>
            <td class="center">${escapeHtml(String(s.context?.quantidadeExpostos || ''))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
`;

const renderRisksAndGuidance = (dm) => `
  <section class="section">
    <h2>3 - RISCOS E ORIENTACOES OPERACIONAIS</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'inventario_riscos'))}
    <table class="inventory-table">
      <thead>
        <tr>
          <th>#</th><th>Cargo</th><th>Perigo</th><th>Dano</th>
          <th>Nivel</th><th>Controles existentes</th><th>Orientacoes</th>
        </tr>
      </thead>
      <tbody>
        ${(dm.quadroRiscos || []).map((r) => `
          <tr>
            <td>${escapeHtml(String(r.ordem || ''))}</td>
            <td>${escapeHtml(r.cargo || '')}</td>
            <td>${escapeHtml(r.perigo || '')}</td>
            <td>${escapeHtml(r.dano || '')}</td>
            <td style="color:${LEVEL_COLORS[r.nivel] || '#333'};font-weight:700">${escapeHtml(r.nivel || '')}</td>
            <td>${escapeHtml(r.controles || '')}</td>
            <td>${escapeHtml(r.acoes || 'Seguir orientacoes da equipe tecnica')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
`;

const renderResponsibilities = (dm) => `
  <section class="section compact">
    <h2>4 - RESPONSABILIDADES E CONTROLES</h2>
    ${renderParagraphs(getSectionParagraphs(dm, 'metas_prioridades_controle'))}
    <div class="responsibilities-box">
      <p><strong>Responsabilidades do empregador:</strong></p>
      <ul>
        <li>Informar aos trabalhadores os riscos ocupacionais existentes nos locais de trabalho.</li>
        <li>Elaborar ordens de servico sobre seguranca e saude no trabalho.</li>
        <li>Fornecer os EPIs adequados e em perfeitas condicoes de uso.</li>
        <li>Garantir treinamento adequado para uso dos EPIs e procedimentos de seguranca.</li>
      </ul>
      <p><strong>Responsabilidades do trabalhador:</strong></p>
      <ul>
        <li>Cumprir as disposicoes legais e regulamentares sobre SST.</li>
        <li>Utilizar os equipamentos de protecao individual fornecidos pelo empregador.</li>
        <li>Comunicar imediatamente qualquer situacao de risco ao supervisor.</li>
        <li>Participar dos treinamentos e capacitacoes oferecidos.</li>
      </ul>
    </div>
  </section>
`;

const renderClosing = (dm) => `
  <section class="section compact">
    <h2>5 - ENCERRAMENTO</h2>
    <p>${escapeHtml(dm.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
    <div class="signature-block">
      <div><strong>Responsavel tecnico:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</div>
      <div><strong>Registro:</strong> ${escapeHtml(dm.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</div>
      <div><strong>Hash documental:</strong> ${escapeHtml(dm.fechamentoTecnico?.hash || 'n/a')}</div>
    </div>
    <div class="worker-signature">
      <p class="worker-title">CIENCIA DO TRABALHADOR</p>
      <p>Declaro que fui informado(a) sobre os riscos ocupacionais, medidas de protecao e procedimentos em caso de emergencia do meu local e posto de trabalho.</p>
      <div class="signature-line">
        <div class="sig-field"><div class="sig-line"></div><div>Nome completo</div></div>
        <div class="sig-field"><div class="sig-line"></div><div>Assinatura</div></div>
        <div class="sig-field sig-date"><div class="sig-line"></div><div>Data</div></div>
      </div>
    </div>
  </section>
`;

const renderWorkOrderHtml = (dm) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(dm.documento?.titulo || 'Ordem de Servico')}</title>
    <style>
      @page { size: A4; margin: 92px 34px 76px 34px; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; background: #fff; }
      p { margin: 0 0 10px; }
      .cover { min-height: calc(100vh - 168px); text-align: center; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 24px 0 18px; page-break-after: always; }
      .brand-block { margin-top: 10px; }
      .brand-name { font-size: 40px; font-weight: 700; letter-spacing: 0.02em; color: #b45309; }
      .brand-caption { font-size: 8px; color: #92400e; margin-top: 2px; letter-spacing: 0.05em; }
      .cover-company { font-size: 22px; margin-top: 18px; max-width: 560px; text-transform: uppercase; }
      .cover-code { font-size: 58px; font-weight: 700; margin-top: 110px; color: #b45309; }
      .cover-title { font-size: 20px; font-weight: 700; margin-top: 24px; }
      .cover-normative { font-size: 18px; margin-top: 86px; color: #b45309; }
      .cover-dates { font-size: 14px; margin-top: 78px; }
      .section { page-break-before: always; }
      .compact { page-break-inside: avoid; }
      h2 { margin: 0 0 18px; font-size: 18px; font-weight: 700; text-transform: uppercase; color: #b45309; }
      .label-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 22px; margin-bottom: 18px; }
      .label-grid .full { grid-column: 1 / -1; }
      table { width: 100%; border-collapse: collapse; }
      .meta-table td, .simple-table td, .simple-table th, .inventory-table td, .inventory-table th { border: 1px solid #e5d5b0; padding: 6px 7px; vertical-align: top; }
      .simple-table th, .inventory-table th { background: #fef3c7; font-size: 10px; font-weight: 700; color: #92400e; }
      .inventory-table { table-layout: fixed; }
      .inventory-table th, .inventory-table td { font-size: 9px; }
      .meta-table td:first-child, .meta-table td:nth-child(3) { width: 18%; background: #fef3c7; font-weight: 700; color: #92400e; }
      .center { text-align: center; }
      .responsibilities-box { margin-top: 12px; }
      .responsibilities-box ul { margin: 4px 0 12px 18px; padding: 0; }
      .responsibilities-box li { margin-bottom: 4px; }
      .signature-block { margin-top: 24px; }
      .worker-signature { margin-top: 40px; border: 2px solid #b45309; padding: 18px; border-radius: 4px; }
      .worker-title { font-size: 14px; font-weight: 700; text-align: center; color: #b45309; margin-bottom: 12px; }
      .signature-line { display: flex; gap: 24px; margin-top: 36px; }
      .sig-field { flex: 1; text-align: center; font-size: 10px; }
      .sig-field.sig-date { flex: 0.5; }
      .sig-line { border-bottom: 1px solid #333; margin-bottom: 4px; height: 28px; }
      .header { width: 100%; font-size: 8px; color: #444; padding: 0 8px; }
      .header-inner { width: 100%; display: flex; align-items: center; justify-content: space-between; }
      .header-brand { text-align: center; width: 100%; font-weight: 700; color: #b45309; }
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
    ${renderScope(dm)}
    ${renderRisksAndGuidance(dm)}
    ${renderResponsibilities(dm)}
    ${renderClosing(dm)}
  </body>
</html>`;

const renderHeader = (dm) => `
  <div class="header"><div class="header-inner">
    <div class="header-brand">${escapeHtml(dm.identidadeVisual?.brandName || 'CEST')} — ORDEM DE SERVICO</div>
    <div class="header-page"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
  </div></div>
`;

const renderFooter = (dm) => `
  <div class="footer"><div class="footer-inner">
    ${escapeHtml(dm.identidadeVisual?.brandName || 'SST SaaS')}
    <small>${escapeHtml(dm.empresa?.endereco || '')} ${escapeHtml(dm.empresa?.cidade || '')} - ${escapeHtml(dm.empresa?.estado || '')}</small>
  </div></div>
`;

module.exports = {
  meta: { type: 'ordem_servico', title: 'Template formal Ordem de Servico' },
  render: async ({ documentModel }) => ({
    html: renderWorkOrderHtml(documentModel),
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
