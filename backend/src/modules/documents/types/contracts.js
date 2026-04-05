const DOCUMENT_OUTPUT_FORMATS = ['pdf', 'html'];

const DOCUMENT_TYPES = [
  'inventario',
  'pgr',
  'ltcat',
  'laudo_insalubridade',
  'laudo_periculosidade',
  'laudo_tecnico',
  'ordem_servico'
];

const assertDocumentType = (documentType) => {
  const normalized = String(documentType || '').trim();
  if (!DOCUMENT_TYPES.includes(normalized)) {
    throw new Error(`Tipo documental nao suportado: ${normalized || 'n/a'}`);
  }
  return normalized;
};

const assertOutputFormat = (format = 'pdf') => {
  const normalized = String(format || 'pdf').trim().toLowerCase();
  if (!DOCUMENT_OUTPUT_FORMATS.includes(normalized)) {
    throw new Error(`Formato de saida nao suportado: ${normalized}`);
  }
  return normalized;
};

module.exports = {
  DOCUMENT_OUTPUT_FORMATS,
  DOCUMENT_TYPES,
  assertDocumentType,
  assertOutputFormat
};
