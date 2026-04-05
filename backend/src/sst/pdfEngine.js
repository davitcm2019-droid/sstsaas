const PDFDocument = require('pdfkit');

const DEFAULT_FALLBACK = {
  naoInformado: 'Nao informado',
  semDados: 'Sem dados disponiveis',
  semAvaliacoes: 'Sem avaliacoes disponiveis',
  semRiscos: 'Nenhum risco publicado neste escopo.',
  semControles: 'Sem controles registrados',
  semAcoes: 'Sem acoes vinculadas',
  semAnexos: 'Sem anexos disponiveis',
  semResumo: 'Sem resumo editavel.',
  semNotas: 'Sem notas adicionais.',
  semRessalvas: 'Sem ressalvas registradas.'
};

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleString('pt-BR');
};

const normalizeFileName = (value) =>
  String(value || 'documento-tecnico')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const normalizePdfData = (document, version, pdfData = null) => {
  const content = version?.content || {};
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  const fallback = { ...DEFAULT_FALLBACK, ...(pdfData?.fallback || {}) };
  const assessmentContexts =
    pdfData?.assessmentContexts instanceof Map
      ? pdfData.assessmentContexts
      : new Map(Object.entries(pdfData?.assessmentContexts || {}));

  return {
    fallback,
    labels: {
      documentTypeLabel: pdfData?.labels?.documentTypeLabel || document?.documentType || 'Documento Tecnico'
    },
    empresa: pdfData?.empresa || null,
    sectionsPlan: Array.isArray(pdfData?.sectionsPlan) ? pdfData.sectionsPlan : [{ key: 'identificacao', title: '1 - IDENTIFICACAO DA EMPRESA' }],
    missingData: Array.isArray(pdfData?.missingData) ? pdfData.missingData : [],
    summary: pdfData?.summary || {
      overview: fallback.semDados,
      assessmentsCount: assessments.length,
      risksCount: assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.totalRisks || 0), 0),
      actionItemsCount: assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.actionItems || 0), 0)
    },
    assessmentContexts,
    raw: pdfData?.raw || { document, version, content }
  };
};

const writeKeyValue = (doc, label, value, options = {}) => {
  const startX = options.x ?? doc.x;
  const startY = options.y ?? doc.y;
  const width = options.width ?? 500;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${label}:`, startX, startY, {
    width
  });
  doc.font('Helvetica').fontSize(10).fillColor('#334155').text(String(value || DEFAULT_FALLBACK.naoInformado), startX + 110, startY, {
    width: width - 110
  });
  doc.y = Math.max(doc.y, startY + 16);
};

const writeParagraph = (doc, value, options = {}) => {
  if (!String(value || '').trim()) return;
  doc.font(options.font || 'Helvetica').fontSize(options.size || 10.5).fillColor(options.color || '#334155').text(String(value), {
    width: options.width || 500,
    align: options.align || 'left',
    lineGap: options.lineGap || 4
  });
  doc.moveDown(options.afterGap || 0.6);
};

const writeSectionTitle = (doc, title) => {
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(title);
  doc.moveDown(0.2);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.x + 500, doc.y).stroke();
  doc.moveDown(0.8);
};

const ensureSpace = (doc, requiredHeight = 120) => {
  if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom - 28) {
    doc.addPage();
  }
};

const getAssessmentContext = (pdfData, assessmentContent) => {
  const assessmentId = String(assessmentContent?.fixed?.assessment?.id || '');
  return pdfData.assessmentContexts.get(assessmentId) || null;
};

const collectActionItems = (assessments = []) =>
  assessments.flatMap((assessment) =>
    (assessment?.dynamic?.risks || []).flatMap((risk) =>
      (risk?.actionPlanItems || []).map((item) => ({
        title: item?.title || DEFAULT_FALLBACK.semAcoes,
        status: item?.status || 'pendente',
        responsible: item?.responsible || DEFAULT_FALLBACK.naoInformado,
        acceptanceCriteria: item?.acceptanceCriteria || DEFAULT_FALLBACK.semDados,
        riskTitle: risk?.hazard || DEFAULT_FALLBACK.naoInformado,
        sector: assessment?.fixed?.sector?.nome || DEFAULT_FALLBACK.naoInformado,
        role: assessment?.fixed?.role?.nome || DEFAULT_FALLBACK.naoInformado
      }))
    )
  );

const renderPendingDataBox = (doc, missingData = []) => {
  if (!missingData.length) return;
  ensureSpace(doc, 90);
  const boxX = doc.x;
  const boxY = doc.y;
  doc.roundedRect(boxX, boxY, 500, 18 + missingData.length * 14, 10).fillAndStroke('#fef3c7', '#f59e0b');
  doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(10).text('DADOS PENDENTES', boxX + 12, boxY + 10);
  doc.font('Helvetica').fontSize(9.5).fillColor('#78350f');
  missingData.forEach((item, index) => {
    doc.text(`- ${item}`, boxX + 12, boxY + 28 + index * 14);
  });
  doc.y = boxY + 30 + missingData.length * 14;
  doc.moveDown(0.8);
};

const writeRiskCard = (doc, risk = {}, index = 0, fallback = DEFAULT_FALLBACK) => {
  ensureSpace(doc, 116);
  const cardX = doc.x;
  const cardY = doc.y;
  const cardWidth = 500;
  const cardHeight = 102;
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 12).fillAndStroke('#f8fafc', '#e2e8f0');

  const startX = cardX + 14;
  const startY = cardY + 10;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${risk.hazard || fallback.naoInformado}`, startX, startY, {
    width: 318
  });
  doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
    `${risk.factor || fallback.naoInformado} / ${risk.agent || fallback.naoInformado} / Nivel ${risk.level || fallback.naoInformado}`,
    startX,
    startY + 18,
    { width: 318 }
  );
  doc.text(`Fonte: ${risk.source || fallback.naoInformado}`, startX, startY + 34, { width: 318 });
  doc.text(`Dano: ${risk.damage || fallback.naoInformado}`, startX, startY + 48, { width: 318 });
  doc.text(`Probabilidade x Severidade: ${risk.probability || '-'} x ${risk.severity || '-'}`, startX, startY + 62, { width: 318 });

  const sideX = startX + 330;
  const controlsText =
    Array.isArray(risk.controls) && risk.controls.length
      ? risk.controls.map((control) => control.description).join('; ')
      : fallback.semControles;
  const actionsText =
    Array.isArray(risk.actionPlanItems) && risk.actionPlanItems.length
      ? risk.actionPlanItems.map((item) => item.title).join('; ')
      : fallback.semAcoes;

  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Controles', sideX, startY, { width: 142 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(controlsText, sideX, startY + 14, { width: 142 });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Plano de acao', sideX, startY + 50, { width: 142 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(actionsText, sideX, startY + 64, { width: 142 });

  doc.y = cardY + cardHeight + 12;
};

const renderCover = (doc, { document, version, pdfData }) => {
  const empresa = pdfData.empresa || {};
  doc.rect(0, 0, doc.page.width, 220).fill('#0f172a');
  doc.fillColor('#8cf045').font('Helvetica-Bold').fontSize(12).text('SST SAAS', 48, 54);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text(pdfData.labels.documentTypeLabel || document?.title || 'Documento Tecnico', 48, 92, {
    width: 420
  });
  doc.font('Helvetica').fontSize(11).fillColor('#cbd5e1').text(document?.title || DEFAULT_FALLBACK.naoInformado, 48, 132, {
    width: 420
  });

  doc.fillColor('#0f172a');
  doc.y = 260;
  writeSectionTitle(doc, 'Capa documental');
  writeKeyValue(doc, 'Empresa', empresa.nome || document?.empresaId || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNPJ', empresa.cnpj || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'CNAE', empresa.cnae || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Endereco', `${empresa.endereco || DEFAULT_FALLBACK.naoInformado} / ${empresa.cidade || DEFAULT_FALLBACK.naoInformado} / ${empresa.estado || DEFAULT_FALLBACK.naoInformado}`);
  writeKeyValue(doc, 'Escopo', `${document?.scopeType || DEFAULT_FALLBACK.naoInformado} / ${document?.scopeRefId || DEFAULT_FALLBACK.naoInformado}`);
  writeKeyValue(doc, 'Versao', `v${version?.version || document?.latestVersion || 1}`);
  writeKeyValue(doc, 'Hash', version?.hash || 'n/a');
  writeKeyValue(doc, 'Emitido em', formatDate(version?.issuedAt));
  writeParagraph(doc, pdfData.summary?.overview || DEFAULT_FALLBACK.semDados);
  renderPendingDataBox(doc, pdfData.missingData || []);
};

const renderSummaryPlaceholder = (doc) => {
  writeSectionTitle(doc, 'SUMARIO');
  writeParagraph(doc, 'Carregando estrutura do documento...');
};

const renderSummaryPage = (doc, { summaryPageIndex, sections, document, version }) => {
  doc.switchToPage(summaryPageIndex);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text('SUMARIO', 48, 60);
  doc.font('Helvetica').fontSize(10).fillColor('#475569').text(
    `${document?.title || 'Documento Tecnico'} / versao ${version?.version || document?.latestVersion || 1}`,
    48,
    88,
    { width: 500 }
  );

  let currentY = 132;
  sections.forEach((section) => {
    doc.font('Helvetica').fontSize(10.5).fillColor('#0f172a').text(section.title, 48, currentY, { width: 380 });
    doc.strokeColor('#cbd5e1').dash(1, { space: 3 }).moveTo(300, currentY + 8).lineTo(500, currentY + 8).stroke().undash();
    doc.font('Helvetica-Bold').text(String(section.page), 510, currentY, { width: 36, align: 'right' });
    currentY += 24;
  });
};

const renderIdentificationSection = (doc, { document, version, pdfData }) => {
  const empresa = pdfData.empresa || {};
  writeParagraph(doc, 'Documento tecnico emitido a partir da base publicada do modulo SST, com rastreabilidade do escopo, versao e responsavel tecnico.');
  writeKeyValue(doc, 'Tipo de documento', pdfData.labels.documentTypeLabel);
  writeKeyValue(doc, 'Titulo emitido', document?.title || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Empresa', empresa.nome);
  writeKeyValue(doc, 'CNPJ', empresa.cnpj);
  writeKeyValue(doc, 'CNAE', empresa.cnae);
  writeKeyValue(doc, 'Endereco', empresa.endereco);
  writeKeyValue(doc, 'Cidade / UF', `${empresa.cidade} / ${empresa.estado}`);
  writeKeyValue(doc, 'CEP', empresa.cep);
  writeKeyValue(doc, 'Telefone', empresa.telefone);
  writeKeyValue(doc, 'Email', empresa.email);
  writeKeyValue(doc, 'Escopo', `${document?.scopeType || DEFAULT_FALLBACK.naoInformado} / ${document?.scopeRefId || DEFAULT_FALLBACK.naoInformado}`);
  writeKeyValue(doc, 'Hash de integridade', version?.hash || 'n/a');
  renderPendingDataBox(doc, pdfData.missingData || []);
};

const renderEvaluatorsSection = (doc, { version, content }) => {
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  const seen = new Set();
  const technicalPeople = assessments
    .map((assessment) => assessment?.fixed?.assessment?.responsibleTechnical)
    .filter(Boolean)
    .filter((person) => {
      const key = `${person?.nome || ''}:${person?.registro || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  writeParagraph(doc, 'Equipe tecnica vinculada ao documento emitido e responsavel pelo conjunto de avaliacoes utilizadas.');
  writeKeyValue(doc, 'Emitido por', version?.issuedBy?.nome || version?.issuedBy?.email || DEFAULT_FALLBACK.naoInformado);
  writeKeyValue(doc, 'Emitido em', formatDate(version?.issuedAt));
  if (!technicalPeople.length) {
    writeParagraph(doc, DEFAULT_FALLBACK.semDados);
    return;
  }

  technicalPeople.forEach((person, index) => {
    ensureSpace(doc, 48);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(`Responsavel tecnico ${index + 1}`, {
      width: 500
    });
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text(`Nome: ${person?.nome || DEFAULT_FALLBACK.naoInformado}`);
    doc.text(`Email: ${person?.email || DEFAULT_FALLBACK.naoInformado}`);
    doc.text(`Registro: ${person?.registro || DEFAULT_FALLBACK.naoInformado}`);
    doc.moveDown(0.6);
  });
};

const renderStandardTextSection = (doc, paragraphs = []) => {
  paragraphs.forEach((paragraph) => writeParagraph(doc, paragraph));
};

const renderAbrangenciaSection = (doc, { content, fallback }) => {
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  if (!assessments.length) {
    writeParagraph(doc, fallback.semAvaliacoes);
    return;
  }

  assessments.forEach((assessment, index) => {
    ensureSpace(doc, 88);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Avaliacao ${index + 1} - ${assessment?.fixed?.assessment?.title || fallback.naoInformado}`);
    doc.moveDown(0.2);
    writeKeyValue(doc, 'Estabelecimento', assessment?.fixed?.establishment?.nome || fallback.naoInformado);
    writeKeyValue(doc, 'Setor', assessment?.fixed?.sector?.nome || fallback.naoInformado);
    writeKeyValue(doc, 'Cargo', assessment?.fixed?.role?.nome || fallback.naoInformado);
    writeKeyValue(doc, 'Versao', `v${assessment?.fixed?.assessment?.version || 1}`);
  });
};

const renderInventorySection = (doc, { content, pdfData, includeConclusions = false }) => {
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  if (!assessments.length) {
    writeParagraph(doc, pdfData.fallback.semAvaliacoes);
    return;
  }

  assessments.forEach((assessment, assessmentIndex) => {
    ensureSpace(doc, 90);
    const context = getAssessmentContext(pdfData, assessment);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(
      `${assessmentIndex + 1}. ${assessment?.fixed?.assessment?.title || pdfData.fallback.naoInformado}`,
      { width: 500 }
    );
    doc.moveDown(0.2);
    writeKeyValue(doc, 'Setor', assessment?.fixed?.sector?.nome || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Cargo', assessment?.fixed?.role?.nome || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Local / posto', context?.context?.localAreaPosto || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Processo principal', context?.context?.processoPrincipal || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Jornada / turno', context?.context?.jornadaTurno || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Quantidade exposta', context?.context?.quantidadeExpostos || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Condicao operacional', context?.context?.condicaoOperacional || pdfData.fallback.naoInformado);

    if (includeConclusions) {
      writeParagraph(
        doc,
        assessment?.dynamic?.conclusion?.basis ||
          assessment?.dynamic?.conclusion?.result ||
          pdfData.fallback.semDados
      );
    }

    const risks = Array.isArray(assessment?.dynamic?.risks) ? assessment.dynamic.risks : [];
    if (!risks.length) {
      writeParagraph(doc, pdfData.fallback.semRiscos);
      return;
    }

    risks.forEach((risk, riskIndex) => writeRiskCard(doc, risk, riskIndex, pdfData.fallback));
  });
};

const renderPlanSection = (doc, { content, fallback }) => {
  const actionItems = collectActionItems(Array.isArray(content.assessments) ? content.assessments : []);
  if (!actionItems.length) {
    writeParagraph(doc, fallback.semAcoes);
    return;
  }

  actionItems.forEach((item, index) => {
    ensureSpace(doc, 76);
    doc.roundedRect(doc.x, doc.y, 500, 62, 10).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(`${index + 1}. ${item.title}`, doc.x + 12, doc.y + 10, { width: 470 });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
      `Risco: ${item.riskTitle} / Setor: ${item.sector} / Cargo: ${item.role}`,
      doc.x + 12,
      doc.y + 28,
      { width: 470 }
    );
    doc.text(`Responsavel: ${item.responsible} / Status: ${item.status}`, doc.x + 12, doc.y + 42, { width: 470 });
    doc.y += 74;
  });
};

const renderMethodologySection = (doc, { content, pdfData }) => {
  writeParagraph(
    doc,
    'A metodologia das avaliacoes foi consolidada a partir das avaliacoes publicadas no sistema, respeitando o escopo, o contexto operacional e a base tecnica registrada no modulo SST.'
  );
  renderInventorySection(doc, { content, pdfData, includeConclusions: false });
};

const renderEquipmentSection = (doc, { content, fallback }) => {
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  const narratives = assessments
    .map((assessment) => assessment?.dynamic?.conclusion?.basis || '')
    .filter((text) => String(text).trim());

  writeParagraph(
    doc,
    'Nao foram encontrados registros estruturados de equipamentos e instrumentos nesta versao documental. Quando disponiveis, eles devem ser descritos na base tecnica da avaliacao e serao refletidos automaticamente no PDF.'
  );

  if (narratives.length) {
    writeParagraph(doc, `Base tecnica disponivel: ${narratives[0]}`);
  } else {
    writeParagraph(doc, fallback.semDados);
  }
};

const renderConclusionSection = (doc, { content, pdfData, version }) => {
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  if (!assessments.length) {
    writeParagraph(doc, pdfData.fallback.semAvaliacoes);
    return;
  }

  assessments.forEach((assessment, index) => {
    ensureSpace(doc, 84);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Conclusao da avaliacao ${index + 1}`);
    doc.moveDown(0.2);
    writeParagraph(
      doc,
      assessment?.dynamic?.conclusion?.result || assessment?.dynamic?.conclusion?.basis || pdfData.fallback.semDados
    );
    writeKeyValue(doc, 'Assinado por', assessment?.dynamic?.conclusion?.signedBy?.nome || pdfData.fallback.naoInformado);
    writeKeyValue(doc, 'Assinado em', formatDate(assessment?.dynamic?.conclusion?.signedAt));
  });

  writeParagraph(doc, `Hash da versao emitida: ${version?.hash || 'n/a'}`);
};

const renderReferencesSection = (doc) => {
  const references = [
    'NR-01 - Disposicoes gerais e gerenciamento de riscos ocupacionais.',
    'Base tecnica publicada no modulo SST da organizacao.',
    'Documentacao e evidencias registradas na versao emitida.'
  ];
  references.forEach((reference) => writeParagraph(doc, `- ${reference}`));
};

const renderAnnexesSection = (doc, { content, fallback }) => {
  const annexes = Array.isArray(content.annexes) ? content.annexes : [];
  if (!annexes.length) {
    writeParagraph(doc, fallback.semAnexos);
    return;
  }

  annexes.forEach((annex, index) => {
    ensureSpace(doc, 110);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Anexo ${index + 1} - ${annex?.title || fallback.naoInformado}`);
    doc.moveDown(0.25);
    writeParagraph(doc, annex?.content || fallback.semDados);
  });
};

const renderSectionByKey = (doc, section, context) => {
  const { content, pdfData, document, version } = context;
  writeSectionTitle(doc, section.title);

  switch (section.key) {
    case 'identificacao':
      renderIdentificationSection(doc, { document, version, pdfData });
      break;
    case 'avaliadores':
      renderEvaluatorsSection(doc, { version, content });
      break;
    case 'apresentacao':
      renderStandardTextSection(doc, [
        'Este documento consolida a base tecnica publicada no sistema SST para apoiar a emissao, a rastreabilidade e a manutencao do historico documental.',
        content?.model?.layers?.fixed || pdfData.summary?.overview || pdfData.fallback.semDados
      ]);
      break;
    case 'objetivos':
      renderStandardTextSection(doc, [
        'Apresentar o panorama dos riscos ocupacionais identificados no escopo selecionado e registrar as medidas de controle e as acoes derivadas da avaliacao publicada.',
        content?.editable?.resumo || pdfData.fallback.semResumo
      ]);
      break;
    case 'abrangencia':
      renderAbrangenciaSection(doc, { content, fallback: pdfData.fallback });
      break;
    case 'inventario':
    case 'analise':
      renderInventorySection(doc, { content, pdfData, includeConclusions: section.key === 'analise' });
      break;
    case 'plano':
      renderPlanSection(doc, { content, fallback: pdfData.fallback });
      break;
    case 'encerramento':
      renderStandardTextSection(doc, [
        content?.editable?.notas || pdfData.fallback.semNotas,
        content?.editable?.ressalvas || pdfData.fallback.semRessalvas,
        `Documento emitido em ${formatDate(version?.issuedAt)} com hash ${version?.hash || 'n/a'}.`
      ]);
      break;
    case 'introducao':
      renderStandardTextSection(doc, [
        'O presente documento foi estruturado a partir das avaliacoes publicadas no modulo SST, refletindo o estado tecnico vigente do escopo selecionado.',
        pdfData.summary?.overview || pdfData.fallback.semDados
      ]);
      break;
    case 'metodologia':
      renderMethodologySection(doc, { content, pdfData });
      break;
    case 'equipamentos':
      renderEquipmentSection(doc, { content, fallback: pdfData.fallback });
      break;
    case 'conclusao':
      renderConclusionSection(doc, { content, pdfData, version });
      break;
    case 'referencias':
      renderReferencesSection(doc);
      break;
    case 'anexos':
      renderAnnexesSection(doc, { content, fallback: pdfData.fallback });
      break;
    default:
      writeParagraph(doc, pdfData.fallback.semDados);
      break;
  }
};

const renderPageChrome = (doc, { document, version, pageIndex, totalPages }) => {
  const headerY = 26;
  const footerY = doc.page.height - 32;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(`${pageIndex + 1}/${totalPages}`, 48, headerY, {
    width: 500,
    align: 'right'
  });
  doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
    `${document?.title || 'Documento Tecnico'} / v${version?.version || document?.latestVersion || 1} / hash ${version?.hash || 'n/a'}`,
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

const renderIssuedDocumentPdfBuffer = ({ document, version, pdfData = null, options = {} }) =>
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

    const resolvedPdfData = normalizePdfData(document, version, pdfData);
    const content = version?.content || {};

    pdf.info.Title = document?.title || 'Documento tecnico';
    pdf.info.Author = version?.issuedBy?.nome || 'SST SaaS';
    pdf.info.Subject = resolvedPdfData.labels.documentTypeLabel || `Documento ${document?.documentType || ''}`;

    renderCover(pdf, { document, version, pdfData: resolvedPdfData });

    pdf.addPage();
    const summaryPageIndex = pdf.bufferedPageRange().count - 1;
    renderSummaryPlaceholder(pdf);

    const sectionPages = [];
    resolvedPdfData.sectionsPlan.forEach((section) => {
      pdf.addPage();
      const pageNumber = pdf.bufferedPageRange().count;
      sectionPages.push({ title: section.title, page: pageNumber });
      renderSectionByKey(pdf, section, {
        document,
        version,
        content,
        pdfData: resolvedPdfData
      });
    });

    renderSummaryPage(pdf, {
      summaryPageIndex,
      sections: sectionPages,
      document,
      version
    });

    const range = pdf.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      pdf.switchToPage(pageIndex);
      renderPageChrome(pdf, {
        document,
        version,
        pageIndex,
        totalPages: range.count
      });
    }

    pdf.end();
  });

module.exports = {
  buildIssuedDocumentPdfFilename,
  renderIssuedDocumentPdfBuffer
};
