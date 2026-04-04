const PDFDocument = require('pdfkit');

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

const writeLabelValue = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(String(value || 'Nao informado'));
};

const writeParagraph = (doc, value) => {
  if (!value) return;
  doc.font('Helvetica').fontSize(10).fillColor('#334155').text(String(value), { lineGap: 3 });
  doc.moveDown(0.8);
};

const writeSectionTitle = (doc, title) => {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(title);
  doc.moveDown(0.35);
};

const writeRiskCard = (doc, risk = {}, index = 0) => {
  const cardX = doc.x;
  const cardY = doc.y;
  const cardWidth = 500;
  const cardHeight = 94;

  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 12).fillAndStroke('#f8fafc', '#e2e8f0');

  const startX = cardX + 14;
  const startY = cardY + 10;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${risk.hazard || 'Risco sem titulo'}`, startX, startY, {
    width: 320
  });
  doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
    `${risk.factor || 'Sem fator'} • ${risk.agent || 'Sem agente'} • Nivel ${risk.level || 'n/d'}`,
    startX,
    startY + 18,
    { width: 320 }
  );
  doc.text(`Fonte: ${risk.source || 'Nao informada'}`, startX, startY + 34, { width: 320 });
  doc.text(`Dano: ${risk.damage || 'Nao informado'}`, startX, startY + 48, { width: 320 });
  doc.text(`P x S: ${risk.probability || '-'} x ${risk.severity || '-'}`, startX, startY + 62, { width: 320 });

  const sideX = startX + 330;
  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Controles', sideX, startY, { width: 142 });
  const controlSummary =
    Array.isArray(risk.controls) && risk.controls.length
      ? risk.controls.map((control) => control.description).join('; ')
      : 'Sem controles registrados';
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(controlSummary, sideX, startY + 16, { width: 142 });

  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Acoes', sideX, startY + 52, { width: 142 });
  const actionSummary =
    Array.isArray(risk.actionPlanItems) && risk.actionPlanItems.length
      ? risk.actionPlanItems.map((item) => item.title).join('; ')
      : 'Sem acoes vinculadas';
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(actionSummary, sideX, startY + 68, { width: 142 });

  doc.y = cardY + cardHeight + 10;
};

const buildIssuedDocumentPdfFilename = (document, version) => {
  const base = normalizeFileName(document?.title || 'documento-tecnico');
  const versionLabel = `v${version?.version || document?.latestVersion || 1}`;
  return `${base}-${versionLabel}.pdf`;
};

const renderIssuedDocumentPdfBuffer = ({ document, version }) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });

    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const content = version?.content || {};
    const assessments = Array.isArray(content.assessments) ? content.assessments : [];
    const fixedNarrative =
      content?.model?.layers?.fixed ||
      content?.template?.layers?.fixed ||
      assessments[0]?.fixed?.narrative ||
      '';

    pdf.info.Title = document?.title || 'Documento tecnico';
    pdf.info.Author = version?.issuedBy?.nome || 'SST SaaS';
    pdf.info.Subject = `Documento ${document?.documentType || ''}`;

    pdf.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(document?.title || 'Documento tecnico');
    pdf.moveDown(0.2);
    pdf.font('Helvetica').fontSize(10).fillColor('#475569').text(
      `${document?.documentType || 'documento'} • versao ${version?.version || document?.latestVersion || 1} • hash ${version?.hash || 'n/a'}`
    );
    pdf.moveDown(1);

    writeSectionTitle(pdf, 'Metadados');
    writeLabelValue(pdf, 'Escopo', `${document?.scopeType || 'n/d'} / ${document?.scopeRefId || 'n/d'}`);
    writeLabelValue(pdf, 'Empresa', document?.empresaId || 'n/d');
    writeLabelValue(pdf, 'Emitido em', formatDate(version?.issuedAt));
    writeLabelValue(pdf, 'Emitido por', version?.issuedBy?.nome || version?.issuedBy?.email || 'Sistema');
    writeLabelValue(pdf, 'Modelo', version?.documentModelTitle || content?.model?.title || version?.templateCode || 'Modelo padrao');
    pdf.moveDown(0.8);

    writeSectionTitle(pdf, 'Conteudo fixo do modelo');
    writeParagraph(pdf, fixedNarrative || 'Sem conteudo fixo customizado.');

    writeSectionTitle(pdf, 'Conteudo editavel');
    writeLabelValue(pdf, 'Resumo', content?.editable?.resumo || 'Sem resumo editavel.');
    writeLabelValue(pdf, 'Notas', content?.editable?.notas || 'Sem notas adicionais.');
    writeLabelValue(pdf, 'Ressalvas', content?.editable?.ressalvas || 'Sem ressalvas registradas.');

    assessments.forEach((assessmentContent, assessmentIndex) => {
      if (pdf.y > 650) pdf.addPage();
      writeSectionTitle(pdf, `Avaliacao ${assessmentIndex + 1}`);
      writeLabelValue(pdf, 'Titulo', assessmentContent?.fixed?.assessment?.title || 'Sem titulo');
      writeLabelValue(pdf, 'Estabelecimento', assessmentContent?.fixed?.establishment?.nome || 'Nao informado');
      writeLabelValue(pdf, 'Setor', assessmentContent?.fixed?.sector?.nome || 'Nao informado');
      writeLabelValue(pdf, 'Cargo', assessmentContent?.fixed?.role?.nome || 'Nao informado');
      writeLabelValue(pdf, 'RT', assessmentContent?.fixed?.assessment?.responsibleTechnical?.nome || 'Nao informado');
      writeLabelValue(pdf, 'Registro RT', assessmentContent?.fixed?.assessment?.responsibleTechnical?.registro || 'Nao informado');
      pdf.moveDown(0.4);
      writeParagraph(pdf, assessmentContent?.dynamic?.conclusion?.basis || assessmentContent?.dynamic?.conclusion?.result || '');

      const risks = Array.isArray(assessmentContent?.dynamic?.risks) ? assessmentContent.dynamic.risks : [];
      if (!risks.length) {
        writeParagraph(pdf, 'Nenhum risco publicado neste escopo.');
      } else {
        risks.forEach((risk, riskIndex) => {
          if (pdf.y > 690) pdf.addPage();
          writeRiskCard(pdf, risk, riskIndex);
        });
      }
    });

    const annexes = Array.isArray(content?.annexes) ? content.annexes : [];
    annexes.forEach((annex, index) => {
      pdf.addPage();
      writeSectionTitle(pdf, `Anexo ${index + 1} - ${annex?.title || 'Sem titulo'}`);
      writeParagraph(pdf, annex?.content || 'Sem conteudo adicional.');
    });

    const range = pdf.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      pdf.switchToPage(pageIndex);
      pdf.font('Helvetica').fontSize(8).fillColor('#64748b').text(`SST SaaS • pagina ${pageIndex + 1} de ${range.count}`, 48, 790, {
        align: 'right',
        width: 500
      });
    }

    pdf.end();
  });

module.exports = {
  buildIssuedDocumentPdfFilename,
  renderIssuedDocumentPdfBuffer
};
