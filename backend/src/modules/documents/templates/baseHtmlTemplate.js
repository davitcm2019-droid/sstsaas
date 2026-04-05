const { escapeHtml, renderList, renderTable } = require('./templateUtils');

const renderMasterRiskTable = (documentModel) =>
  renderTable({
    columns: [
      { key: 'ordem', label: '#' },
      { key: 'setor', label: 'Setor' },
      { key: 'cargo', label: 'Cargo' },
      { key: 'perigo', label: 'Perigo' },
      { key: 'fator', label: 'Fator' },
      { key: 'agente', label: 'Agente' },
      { key: 'fonte', label: 'Fonte' },
      { key: 'dano', label: 'Dano' },
      { key: 'probabilidade', label: 'P' },
      { key: 'severidade', label: 'S' },
      { key: 'nivel', label: 'Nivel' },
      { key: 'controles', label: 'Controles existentes' },
      { key: 'acoes', label: 'Plano de acao' }
    ],
    rows: documentModel.quadroRiscos || []
  });

const renderIssueFrame = (documentModel) => `
  <div class="issue-frame">
    <div class="card">
      <span class="eyebrow">Controle de emissao</span>
      <p><strong>Documento:</strong> ${escapeHtml(documentModel.emissao?.tipo || 'Nao informado')}</p>
      <p><strong>Empresa:</strong> ${escapeHtml(documentModel.emissao?.empresa || 'Nao informado')}</p>
      <p><strong>Vigencia:</strong> ${escapeHtml(documentModel.emissao?.vigencia || 'Nao informado')}</p>
      <p><strong>Escopo:</strong> ${escapeHtml(documentModel.emissao?.escopo || 'n/a')}</p>
    </div>
    <div class="card">
      <span class="eyebrow">Rastreabilidade</span>
      <p><strong>Versao:</strong> v${escapeHtml(String(documentModel.emissao?.versao || 1))}</p>
      <p><strong>Emitido em:</strong> ${escapeHtml(documentModel.emissao?.emitidoEm || 'Nao informado')}</p>
      <p><strong>Hash:</strong> ${escapeHtml(documentModel.emissao?.hash || 'n/a')}</p>
      <p><strong>RT:</strong> ${escapeHtml(documentModel.emissao?.responsavelTecnico || 'Nao informado')} / ${escapeHtml(documentModel.emissao?.registroResponsavel || 'Nao informado')}</p>
    </div>
    <div class="card">
      <span class="eyebrow">Base consolidada</span>
      <p><strong>Estabelecimentos:</strong> ${escapeHtml(String(documentModel.emissao?.estabelecimentos || 0))}</p>
      <p><strong>Riscos:</strong> ${escapeHtml(String(documentModel.emissao?.riscos || 0))}</p>
      <p><strong>Acoes:</strong> ${escapeHtml(String(documentModel.emissao?.acoes || 0))}</p>
    </div>
  </div>
`;

const renderSectionContent = (section, documentModel) => {
  switch (section.chave) {
    case 'identificacao_empresa':
      return `
        <div class="grid two">
          <div class="card">
            <span class="eyebrow">Empresa</span>
            <h3>${escapeHtml(documentModel.empresa?.nome || 'Nao informado')}</h3>
            <p>CNPJ: ${escapeHtml(documentModel.empresa?.cnpj || 'Nao informado')}</p>
            <p>CNAE: ${escapeHtml(documentModel.empresa?.cnae || 'Nao informado')}</p>
            <p>${escapeHtml(documentModel.empresa?.endereco || 'Nao informado')}</p>
          </div>
          <div class="card">
            <span class="eyebrow">Documento</span>
            <h3>${escapeHtml(documentModel.documento.titulo)}</h3>
            <p>Tipo: ${escapeHtml(documentModel.documento.tipo)}</p>
            <p>Vigencia: ${escapeHtml(documentModel.documento.vigencia)}</p>
            <p>Versao: ${escapeHtml(String(documentModel.documento.versao || 1))}</p>
          </div>
        </div>
      `;
    case 'avaliadores':
      return renderTable({
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'registro', label: 'Registro' },
          { key: 'email', label: 'Email' }
        ],
        rows: documentModel.equipeTecnica || []
      });
    case 'inventario_riscos':
    case 'avaliacao_riscos':
    case 'reconhecimento_analise_riscos':
    case 'analise_riscos_ambiente_trabalho':
      return documentModel.documento?.tipo === 'pgr'
        ? `<div class="pgr-risk-table-wrap">${renderMasterRiskTable(documentModel)}</div>`
        : renderTable({
            columns: [
              { key: 'sector', label: 'Setor' },
              { key: 'role', label: 'Cargo' },
              { key: 'hazard', label: 'Perigo' },
              { key: 'agent', label: 'Agente' },
              { key: 'source', label: 'Fonte' },
              { key: 'damage', label: 'Dano' },
              { key: 'level', label: 'Nivel' }
            ],
            rows: documentModel.inventarioRiscos || []
          });
    case 'metas_prioridades_controle':
      return renderTable({
        columns: [
          { key: 'title', label: 'Acao' },
          { key: 'responsible', label: 'Responsavel' },
          { key: 'status', label: 'Status' },
          { key: 'hazard', label: 'Risco associado' },
          { key: 'sector', label: 'Setor' }
        ],
        rows: documentModel.planoAcao || []
      });
    case 'metodologia':
    case 'metodologia_avaliacoes':
      return `
        <div class="grid two">
          <div class="card">
            <span class="eyebrow">Metodologia</span>
            ${renderList(documentModel.metodologia?.metodologia || [])}
          </div>
          <div class="card">
            <span class="eyebrow">Instrumentos</span>
            ${renderList(documentModel.metodologia?.instrumentos || [])}
          </div>
        </div>
      `;
    case 'conclusao':
      return `
        <div class="card">
          <span class="eyebrow">Fechamento tecnico</span>
          <p>${escapeHtml(documentModel.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
          <p><strong>Assinatura:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</p>
          <p><strong>Registro:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</p>
        </div>
      `;
    default:
      return '';
  }
};

const renderGroupedScopes = (documentModel) =>
  (documentModel.estabelecimentos || [])
    .map(
      (establishment) => `
        <section class="scope-block avoid-break">
          <h2>${escapeHtml(establishment.nome)}</h2>
          ${(establishment.setores || [])
            .map(
              (sector) => `
                <article class="sector-block">
                  <h3>${escapeHtml(sector.nome)}</h3>
                  ${(sector.cargos || [])
                    .map(
                      (role) => `
                        <div class="role-block">
                          <h4>${escapeHtml(role.nome)}</h4>
                          <p><strong>Atividades:</strong> ${escapeHtml((role.atividades || []).join(' | ') || 'Nao informado')}</p>
                          ${renderTable({
                            columns: [
                              { key: 'hazard', label: 'Perigo' },
                              { key: 'agent', label: 'Agente' },
                              { key: 'source', label: 'Fonte' },
                              { key: 'damage', label: 'Dano' },
                              { key: 'level', label: 'Nivel' }
                            ],
                            rows: role.riscos || []
                          })}
                        </div>
                      `
                    )
                    .join('')}
                </article>
              `
            )
            .join('')}
        </section>
      `
    )
    .join('');

const renderDocumentHtml = (documentModel, templateConfig = {}) => {
  const identity = documentModel.identidadeVisual || {};
  const accentColor = identity.accentColor || '#0f766e';
  const accentSoftColor = identity.accentSoftColor || '#ccfbf1';
  const inkColor = identity.inkColor || '#0f172a';
  const mutedColor = identity.mutedColor || '#475569';
  const borderColor = identity.borderColor || '#cbd5e1';

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(documentModel.documento.titulo)}</title>
      <style>
        :root {
          --accent: ${accentColor};
          --accent-soft: ${accentSoftColor};
          --ink: ${inkColor};
          --muted: ${mutedColor};
          --border: ${borderColor};
          --surface: #ffffff;
          --page: #f8fafc;
        }
        @page { size: A4; margin: 110px 24px 80px 24px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: var(--ink); font-family: Arial, Helvetica, sans-serif; background: var(--page); font-size: 11px; line-height: 1.45; }
        main { width: 100%; }
        .cover { min-height: calc(100vh - 160px); padding: 20px 0 0; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
        .cover-hero { border: 1px solid var(--border); border-radius: 22px; padding: 32px; background: linear-gradient(135deg, var(--accent-soft), #ffffff 55%); }
        .cover h1, .cover h2, .cover h3, .section-title, h2, h3, h4 { margin: 0; }
        .brand { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.8); color: var(--accent); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .cover-title { margin-top: 18px; font-size: 32px; line-height: 1.1; }
        .cover-subtitle { margin-top: 8px; max-width: 420px; color: var(--muted); font-size: 14px; }
        .meta-grid, .grid.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .summary-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 18px 0 22px; }
        .issue-frame { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; break-inside: avoid; }
        .metric strong { display: block; margin-top: 6px; font-size: 22px; color: var(--accent); }
        .eyebrow { display: inline-block; margin-bottom: 8px; color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .section { margin-bottom: 18px; padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); break-inside: avoid; }
        .section-title { margin-bottom: 10px; color: var(--accent); font-size: 16px; }
        .section p { margin: 0 0 8px; }
        .note-box { margin-top: 12px; padding: 12px; background: var(--accent-soft); border-radius: 14px; }
        .scope-block, .sector-block, .role-block, .avoid-break { break-inside: avoid; }
        .sector-block { margin-top: 12px; }
        .role-block { margin-top: 10px; padding: 12px; border: 1px dashed var(--border); border-radius: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th, td { border: 1px solid var(--border); padding: 8px; vertical-align: top; text-align: left; }
        th { background: #f8fafc; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
        ul { margin: 8px 0 0 18px; padding: 0; }
        .annex, .technical-closing { page-break-inside: avoid; }
        .page-break { page-break-before: always; }
        .pgr-risk-table-wrap { overflow: hidden; border-radius: 14px; border: 1px solid var(--border); }
        .pgr-risk-table-wrap table { margin-top: 0; font-size: 9px; }
        .pgr-risk-table-wrap td, .pgr-risk-table-wrap th { padding: 6px; }
      </style>
    </head>
    <body>
      <main>
        <section class="cover">
          <div class="cover-hero">
            <span class="brand">${escapeHtml(identity.brandName || 'SST SaaS')}</span>
            <h1 class="cover-title">${escapeHtml(documentModel.documento.tituloFormal || documentModel.documento.titulo)}</h1>
            <p class="cover-subtitle">${escapeHtml(documentModel.documento.subtitulo || templateConfig.subtitle || '')}</p>
            <div class="summary-cards">
              <div class="card metric"><span class="eyebrow">Empresa</span><strong>${escapeHtml(documentModel.empresa?.nome || 'Nao informado')}</strong></div>
              <div class="card metric"><span class="eyebrow">Vigencia</span><strong>${escapeHtml(documentModel.documento.vigencia)}</strong></div>
              <div class="card metric"><span class="eyebrow">Versao</span><strong>v${escapeHtml(String(documentModel.documento.versao || 1))}</strong></div>
            </div>
          </div>
          <div class="meta-grid">
            <div class="card">
              <span class="eyebrow">Emissao</span>
              <p><strong>Emitido em:</strong> ${escapeHtml(documentModel.documento.emitidoEm)}</p>
              <p><strong>Emitido por:</strong> ${escapeHtml(documentModel.documento.emitidoPor)}</p>
              <p><strong>Hash:</strong> ${escapeHtml(documentModel.documento.hash)}</p>
            </div>
            <div class="card">
              <span class="eyebrow">Escopo</span>
              <p><strong>Tipo:</strong> ${escapeHtml(documentModel.documento.scopeType || 'n/a')}</p>
              <p><strong>Referencia:</strong> ${escapeHtml(documentModel.documento.scopeRefId || 'n/a')}</p>
              <p><strong>Template:</strong> ${escapeHtml(documentModel.documento.codigoTemplate || 'padrao')}</p>
            </div>
          </div>
        </section>
        <section class="section">
          <h2 class="section-title">Sumario Executivo</h2>
          <p>${escapeHtml(documentModel.resumo?.executivo || 'Sem resumo executivo.')}</p>
          <div class="summary-cards">
            <div class="card metric"><span class="eyebrow">Setores</span><strong>${escapeHtml(String(documentModel.setores?.length || 0))}</strong></div>
            <div class="card metric"><span class="eyebrow">Riscos</span><strong>${escapeHtml(String(documentModel.inventarioRiscos?.length || 0))}</strong></div>
            <div class="card metric"><span class="eyebrow">Plano de acao</span><strong>${escapeHtml(String(documentModel.planoAcao?.length || 0))}</strong></div>
          </div>
          ${renderIssueFrame(documentModel)}
        </section>
        ${
          documentModel.documento?.tipo === 'pgr'
            ? `<section class="section">
                <h2 class="section-title">Quadro Mestre de Riscos do PGR</h2>
                <p>Estrutura consolidada para emissao formal, com risco, severidade, controles existentes e plano de acao associado.</p>
                <div class="summary-cards">
                  <div class="card metric"><span class="eyebrow">Criticos</span><strong>${escapeHtml(String(documentModel.indicadoresRisco?.criticos || 0))}</strong></div>
                  <div class="card metric"><span class="eyebrow">Altos</span><strong>${escapeHtml(String(documentModel.indicadoresRisco?.altos || 0))}</strong></div>
                  <div class="card metric"><span class="eyebrow">Moderados/Toleraveis</span><strong>${escapeHtml(String((documentModel.indicadoresRisco?.moderados || 0) + (documentModel.indicadoresRisco?.toleraveis || 0)))}</strong></div>
                </div>
                <div class="pgr-risk-table-wrap">
                  ${renderMasterRiskTable(documentModel)}
                </div>
              </section>`
            : ''
        }
        <section class="section page-break">
          <h2 class="section-title">Estrutura Operacional</h2>
          ${renderGroupedScopes(documentModel)}
        </section>
        ${documentModel.secoes
          .map(
            (section) => `
              <section class="section${section.chave === 'conclusao' ? ' page-break' : ''}">
                <h2 class="section-title">${escapeHtml(section.titulo)}</h2>
                ${section.textoNormativo ? `<p><strong>Base normativa:</strong> ${escapeHtml(section.textoNormativo)}</p>` : ''}
                ${section.paragrafos.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                ${renderSectionContent(section, documentModel)}
              </section>
            `
          )
          .join('')}
        <section class="section technical-closing">
          <h2 class="section-title">Fechamento Tecnico</h2>
          <p>${escapeHtml(documentModel.fechamentoTecnico?.texto || 'Sem fechamento tecnico.')}</p>
          <p><strong>Responsavel tecnico:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.nome || 'Nao informado')}</p>
          <p><strong>Registro:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.assinatura?.registro || 'Nao informado')}</p>
          <p><strong>Emitido em:</strong> ${escapeHtml(documentModel.fechamentoTecnico?.emitidoEm || 'Nao informado')}</p>
          <div class="note-box">
            <p><strong>Resumo editavel:</strong> ${escapeHtml(documentModel.notasEditaveis?.resumo || 'Sem resumo editavel.')}</p>
            <p><strong>Notas:</strong> ${escapeHtml(documentModel.notasEditaveis?.notas || 'Sem notas adicionais.')}</p>
            <p><strong>Ressalvas:</strong> ${escapeHtml(documentModel.notasEditaveis?.ressalvas || 'Sem ressalvas registradas.')}</p>
          </div>
        </section>
        ${
          documentModel.anexos?.length
            ? `<section class="section page-break annex">
                <h2 class="section-title">Anexos</h2>
                ${documentModel.anexos
                  .map(
                    (annex) => `
                      <article class="card">
                        <span class="eyebrow">Anexo ${escapeHtml(String(annex.order || ''))}</span>
                        <h3>${escapeHtml(annex.title || 'Sem titulo')}</h3>
                        <p>${escapeHtml(annex.content || 'Sem conteudo.')}</p>
                      </article>
                    `
                  )
                  .join('')}
              </section>`
            : ''
        }
      </main>
    </body>
  </html>`;
};

const renderChromeTemplate = ({ side = 'header', documentModel }) => {
  const color = escapeHtml(documentModel.identidadeVisual?.accentColor || '#0f766e');
  const title = escapeHtml(documentModel.documento.titulo);
  const company = escapeHtml(documentModel.empresa?.nome || 'Nao informado');

  if (side === 'header') {
    return `<div style="width:100%;font-size:8px;padding:0 18px;color:#475569;"><div style="border-bottom:1px solid #cbd5e1;padding-bottom:6px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:${color};">${title}</span><span>${company}</span></div></div>`;
  }

  return `<div style="width:100%;font-size:8px;padding:0 18px;color:#475569;"><div style="border-top:1px solid #cbd5e1;padding-top:6px;display:flex;justify-content:space-between;align-items:center;"><span>Hash ${escapeHtml(documentModel.documento.hash)}</span><span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span></div></div>`;
};

module.exports = {
  renderDocumentHtml,
  renderChromeTemplate
};
