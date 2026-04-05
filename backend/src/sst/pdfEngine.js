const PDFDocument = require('pdfkit');
const { composeDocumentPayload } = require('./documentComposer');

const DEFAULT_FALLBACK = {
  naoInformado: 'Nao informado',
  semDados: 'Sem dados disponiveis',
  semRiscos: 'Nenhum risco publicado neste escopo.',
  semAcoes: 'Sem acoes vinculadas',
  semAnexos: 'Sem anexos disponiveis'
};

const INVENTORY_SECTION_KEYS = new Set([
  'avaliacao_riscos',
  'antecipacao_riscos',
  'inventario_riscos',
  'reconhecimento_analise_riscos',
  'analise_riscos_ambiente_trabalho'
]);

const normalizeFileName = (value) =>
  String(value || 'documento-tecnico')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleString('pt-BR');
};

const stringifyMissingField = (item) => {
  if (!item) return DEFAULT_FALLBACK.semDados;
  if (typeof item === 'string') return item;
  return item.message || item.field || item.code || DEFAULT_FALLBACK.semDados;
};

const ensureSpace = (doc, requiredHeight = 120) => {
  if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom - 30) {
    doc.addPage();
  }
};

const writeSectionTitle = (doc, title) => {
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(title);
  doc.moveDown(0.2);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.x + 500, doc.y).stroke();
  doc.moveDown(0.8);
};

const writeParagraph = (doc, value, options = {}) => {
  const text = String(value || '').trim();
  if (!text) return;
  doc
    .font(options.font || 'Helvetica')
    .fontSize(options.size || 10.5)
    .fillColor(options.color || '#334155')
    .text(text, {
      width: options.width || 500,
      align: options.align || 'left',
      lineGap: options.lineGap || 4
    });
  doc.moveDown(options.afterGap || 0.55);
};

const writeKeyValue = (doc, label, value, options = {}) => {
  const startX = options.x ?? doc.x;
  const startY = options.y ?? doc.y;
  const width = options.width ?? 500;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${label}:`, startX, startY, { width });
  doc.font('Helvetica').fontSize(10).fillColor('#334155').text(String(value || DEFAULT_FALLBACK.naoInformado), startX + 126, startY, {
    width: width - 126
  });
  doc.y = Math.max(doc.y, startY + 16);
};

const renderPendingDataBox = (doc, missingFields = []) => {
  if (!missingFields.length) return;
  ensureSpace(doc, 92);
  const boxX = doc.x;
  const boxY = doc.y;
  const lines = missingFields.map((item) => stringifyMissingField(item));
  const height = 18 + lines.length * 14;
  doc.roundedRect(boxX, boxY, 500, height, 10).fillAndStroke('#fef3c7', '#f59e0b');
  doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(10).text('DADOS COMPLEMENTARES PENDENTES', boxX + 12, boxY + 10);
  doc.font('Helvetica').fontSize(9.5).fillColor('#78350f');
  lines.forEach((line, index) => {
    doc.text(`- ${line}`, boxX + 12, boxY + 28 + index * 14);
  });
  doc.y = boxY + height + 8;
};

const renderCover = (doc, payload) => {
  const meta = payload.documentMeta || {};
  const company = payload.companyProfile || {};

  doc.rect(0, 0, doc.page.width, 220).fill('#0f172a');
  doc.fillColor('#8cf045').font('Helvetica-Bold').fontSize(12).text('SST SAAS', 48, 54);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(23)
    .text(meta.documentTypeLabel || meta.title || 'Documento Tecnico', 48, 92, { width: 430 });
  doc.font('Helvetica').fontSize(11).fillColor('#cbd5e1').text(meta.title || DEFAULT_FALLBACK.naoInformado, 48, 132, { width: 430 });

  doc.fillColor('#0f172a');
  doc.y = 260;
  writeSectionTitle(doc, 'Capa documental');
  writeKeyValue(doc, 'Empresa', company?.nome || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNPJ', company?.cnpj || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNAE', company?.cnae || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(
    doc,
    'Endereco',
    `${company?.endereco || DEFAULT_FALLBACK.naoInformado} / ${company?.cidade || DEFAULT_FALLBACK.naoInformado} / ${company?.estado || DEFAULT_FALLBACK.naoInformado}`
  );
  writeKeyValue(doc, 'Escopo', `${meta.scopeType || DEFAULT_FALLBACK.naoInformado} / ${meta.scopeRefId || DEFAULT_FALLBACK.naoInformado}`);
  writeKeyValue(doc, 'Versao', `v${meta.version || 1}`);
  writeKeyValue(doc, 'Hash', meta.hash || 'n/a');
  writeKeyValue(doc, 'Emitido em', formatDate(meta.issuedAt));
  writeParagraph(doc, payload?.summary?.overview || DEFAULT_FALLBACK.semDados);
  renderPendingDataBox(doc, payload?.readiness?.missingFields || []);
};

const renderSummaryPage = (doc, { summaryPageIndex, sections, payload }) => {
  doc.switchToPage(summaryPageIndex);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text('SUMARIO', 48, 60);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text(`${payload.documentMeta?.title || 'Documento Tecnico'} / versao ${payload.documentMeta?.version || 1}`, 48, 88, { width: 500 });

  let currentY = 132;
  sections.forEach((section) => {
    doc.font('Helvetica').fontSize(10.5).fillColor('#0f172a').text(section.title, 48, currentY, { width: 378 });
    doc.strokeColor('#cbd5e1').dash(1, { space: 3 }).moveTo(298, currentY + 8).lineTo(500, currentY + 8).stroke().undash();
    doc.font('Helvetica-Bold').text(String(section.page), 510, currentY, { width: 36, align: 'right' });
    currentY += 24;
  });
};

const renderTextSection = (doc, section) => {
  const normative = section?.normativeBlock?.normativeText || '';
  if (normative) {
    writeParagraph(doc, normative);
  }
  const paragraphs = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
  if (!paragraphs.length && !normative) {
    writeParagraph(doc, DEFAULT_FALLBACK.semDados);
    return;
  }
  paragraphs.forEach((paragraph) => writeParagraph(doc, paragraph));
};

const renderIdentificationSection = (doc, payload) => {
  const meta = payload.documentMeta || {};
  const company = payload.companyProfile || {};
  writeParagraph(doc, 'Documento tecnico emitido a partir da base publicada do modulo SST, com rastreabilidade por escopo, hash e versao.');
  writeKeyValue(doc, 'Tipo de documento', meta.documentTypeLabel || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Titulo emitido', meta.title || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Empresa', company.nome || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNPJ', company.cnpj || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNAE', company.cnae || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Endereco', company.endereco || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Cidade / UF', `${company.cidade || DEFAULT_FALLBACK.naoInformado} / ${company.estado || DEFAULT_FALLBACK.naoInformado}`);
  writeKeyValue(doc, 'CEP', company.cep || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Telefone', company.telefone || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Email', company.email || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Hash de integridade', meta.hash || 'n/a');
};

const renderEvaluatorsSection = (doc, payload) => {
  const team = Array.isArray(payload.technicalTeam) ? payload.technicalTeam : [];
  writeKeyValue(doc, 'Emitido por', payload?.documentMeta?.issuedBy?.nome || payload?.documentMeta?.issuedBy?.email || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Emitido em', formatDate(payload?.documentMeta?.issuedAt));
  if (!team.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semDados);
    return;
  }
  team.forEach((person, index) => {
    ensureSpace(doc, 50);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(`Responsavel tecnico ${index + 1}`, { width: 500 });
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text(`Nome: ${person.nome || DEFAULT_FALLBACK.naoInformado}`);
    doc.text(`Email: ${person.email || DEFAULT_FALLBACK.naoInformado}`);
    doc.text(`Registro: ${person.registro || DEFAULT_FALLBACK.naoInformado}`);
    doc.moveDown(0.6);
  });
};

const renderInventorySection = (doc, payload, options = {}) => {
  const scopes = Array.isArray(payload.assessmentScope) ? payload.assessmentScope : [];
  if (!scopes.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semRiscos);
    return;
  }

  scopes.forEach((scope, scopeIndex) => {
    ensureSpace(doc, 120);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(`${scopeIndex + 1}. ${scope.title || DEFAULT_FALLBACK.naoInformado}`, { width: 500 });
    doc.moveDown(0.2);
    writeKeyValue(doc, 'Setor', scope.sector || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Cargo', scope.role || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Local / posto', scope.context?.localAreaPosto || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Processo principal', scope.context?.processoPrincipal || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Jornada / turno', scope.context?.jornadaTurno || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Quantidade exposta', scope.context?.quantidadeExpostos || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Condicao operacional', scope.context?.condicaoOperacional || DEFAULT_FALLBACK.naoInformado);
    if (options.includeConclusion) {
      writeParagraph(doc, scope?.conclusion?.basis || scope?.conclusion?.result || DEFAULT_FALLBACK.semDados);
    }

    const risks = Array.isArray(scope.risks) ? scope.risks : [];
    if (!risks.length) {
      writeParagraph(doc, DEFAULT_FALLBACK.semRiscos);
      return;
    }

    risks.forEach((risk, index) => {
      ensureSpace(doc, 124);
      const cardX = doc.x;
      const cardY = doc.y;
      doc.roundedRect(cardX, cardY, 500, 108, 12).fillAndStroke('#f8fafc', '#e2e8f0');
      const leftX = cardX + 14;
      const topY = cardY + 10;

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`${index + 1}. ${risk.hazard || DEFAULT_FALLBACK.naoInformado}`, leftX, topY, { width: 318 });
      doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
        `${risk.factor || DEFAULT_FALLBACK.naoInformado} / ${risk.agent || DEFAULT_FALLBACK.naoInformado} / Nivel ${risk.level || DEFAULT_FALLBACK.naoInformado}`,
        leftX,
        topY + 18,
        { width: 318 }
      );
      doc.text(`Fonte: ${risk.source || DEFAULT_FALLBACK.naoInformado}`, leftX, topY + 34, { width: 318 });
      doc.text(`Dano: ${risk.damage || DEFAULT_FALLBACK.naoInformado}`, leftX, topY + 48, { width: 318 });
      doc.text(`Probabilidade x Severidade: ${risk.probability || '-'} x ${risk.severity || '-'}`, leftX, topY + 62, { width: 318 });

      const rightX = leftX + 330;
      const controlsText =
        Array.isArray(risk.controls) && risk.controls.length
          ? risk.controls.map((control) => control.description).filter(Boolean).join('; ')
          : 'Sem controles registrados';
      const actionsText =
        Array.isArray(risk.actionPlanItems) && risk.actionPlanItems.length
          ? risk.actionPlanItems.map((item) => item.title).filter(Boolean).join('; ')
          : DEFAULT_FALLBACK.semAcoes;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Controles', rightX, topY, { width: 142 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(controlsText || DEFAULT_FALLBACK.semDados, rightX, topY + 14, { width: 142 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Plano de acao', rightX, topY + 52, { width: 142 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(actionsText || DEFAULT_FALLBACK.semDados, rightX, topY + 66, { width: 142 });

      doc.y = cardY + 120;
    });
  });
};

const renderPlanSection = (doc, payload) => {
  const actionPlan = Array.isArray(payload.actionPlan) ? payload.actionPlan : [];
  if (!actionPlan.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semAcoes);
    return;
  }
  actionPlan.forEach((item, index) => {
    ensureSpace(doc, 78);
    doc.roundedRect(doc.x, doc.y, 500, 64, 10).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(`${index + 1}. ${item.title || DEFAULT_FALLBACK.naoInformado}`, doc.x + 12, doc.y + 10, {
      width: 470
    });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
      `Risco: ${item.hazard || DEFAULT_FALLBACK.naoInformado} / Setor: ${item.sector || DEFAULT_FALLBACK.naoInformado} / Cargo: ${item.role || DEFAULT_FALLBACK.naoInformado}`,
      doc.x + 12,
      doc.y + 28,
      { width: 470 }
    );
    doc.text(`Responsavel: ${item.responsible || DEFAULT_FALLBACK.naoInformado} / Status: ${item.status || DEFAULT_FALLBACK.naoInformado}`, doc.x + 12, doc.y + 42, { width: 470 });
    doc.y += 76;
  });
};

const renderConclusionSection = (doc, payload) => {
  const scopes = Array.isArray(payload.assessmentScope) ? payload.assessmentScope : [];
  if (!scopes.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semDados);
    return;
  }
  scopes.forEach((scope, index) => {
    ensureSpace(doc, 90);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Conclusao da avaliacao ${index + 1}`);
    doc.moveDown(0.2);
    writeParagraph(doc, scope?.conclusion?.result || scope?.conclusion?.basis || DEFAULT_FALLBACK.semDados);
    writeKeyValue(doc, 'Fundamentacao', scope?.conclusion?.normativeFrame || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Assinado por', scope?.conclusion?.signedBy || DEFAULT_FALLBACK.naoInformado);
    writeKeyValue(doc, 'Assinado em', formatDate(scope?.conclusion?.signedAt));
  });
  writeParagraph(doc, `Hash da versao emitida: ${payload?.documentMeta?.hash || 'n/a'}`);
};

const renderAnnexesSection = (doc, payload) => {
  const annexes = Array.isArray(payload.annexes) ? payload.annexes : [];
  if (!annexes.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semAnexos);
    return;
  }
  annexes.forEach((annex, index) => {
    ensureSpace(doc, 110);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Anexo ${index + 1} - ${annex?.title || DEFAULT_FALLBACK.naoInformado}`);
    doc.moveDown(0.25);
    writeParagraph(doc, annex?.content || DEFAULT_FALLBACK.semDados);
  });
};

const renderSection = (doc, section, payload) => {
  writeSectionTitle(doc, section.title);
  if (section.key === 'identificacao_empresa') {
    renderIdentificationSection(doc, payload);
    return;
  }
  if (section.key === 'avaliadores') {
    renderEvaluatorsSection(doc, payload);
    return;
  }
  if (INVENTORY_SECTION_KEYS.has(section.key)) {
    renderInventorySection(doc, payload, { includeConclusion: section.key === 'reconhecimento_analise_riscos' || section.key === 'analise_riscos_ambiente_trabalho' });
    return;
  }
  if (section.key === 'metas_prioridades_controle') {
    renderPlanSection(doc, payload);
    return;
  }
  if (section.key === 'conclusao') {
    renderConclusionSection(doc, payload);
    return;
  }
  if (section.key === 'anexos') {
    renderAnnexesSection(doc, payload);
    return;
  }
  renderTextSection(doc, section);
};

const renderPageChrome = (doc, payload, pageIndex, totalPages) => {
  const headerY = 26;
  const footerY = doc.page.height - 32;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(`${pageIndex + 1}/${totalPages}`, 48, headerY, {
    width: 500,
    align: 'right'
  });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      `${payload.documentMeta?.title || 'Documento Tecnico'} / v${payload.documentMeta?.version || 1} / hash ${payload.documentMeta?.hash || 'n/a'}`,
      48,
      footerY,
      { width: 500, align: 'left' }
    );
};

const buildIssuedDocumentPdfFilename = (document, version) => {
  const base = normalizeFileName(document?.title || 'documento-tecnico');
  const versionLabel = `v${version?.version || document?.latestVersion || 1}`;
  return `${base}-${versionLabel}.pdf`;
};

const renderIssuedDocumentPdfBuffer = ({ document, version, pdfData = null, composedDocument = null, options = {} }) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 48,
      bufferPages: true,
      compress: options?.debug?.compress === false ? false : true
    });

    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const payload = composedDocument || composeDocumentPayload({ document, version, pdfData: pdfData || {} });

    pdf.info.Title = payload?.documentMeta?.title || document?.title || 'Documento tecnico';
    pdf.info.Author = payload?.documentMeta?.issuedBy?.nome || 'SST SaaS';
    pdf.info.Subject = payload?.documentMeta?.documentTypeLabel || `Documento ${document?.documentType || ''}`;

    renderCover(pdf, payload);

    pdf.addPage();
    const summaryPageIndex = pdf.bufferedPageRange().count - 1;
    writeSectionTitle(pdf, 'SUMARIO');
    writeParagraph(pdf, 'Carregando estrutura do documento...');

    const sectionPages = [];
    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    sections.forEach((section) => {
      pdf.addPage();
      const pageNumber = pdf.bufferedPageRange().count;
      sectionPages.push({ title: section.title, page: pageNumber });
      renderSection(pdf, section, payload);
    });

    renderSummaryPage(pdf, {
      summaryPageIndex,
      sections: sectionPages,
      payload
    });

    const range = pdf.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      pdf.switchToPage(pageIndex);
      renderPageChrome(pdf, payload, pageIndex, range.count);
    }

    pdf.end();
  });

module.exports = {
  buildIssuedDocumentPdfFilename,
  renderIssuedDocumentPdfBuffer
};
