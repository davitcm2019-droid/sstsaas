const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createSearchRegex = (value = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return new RegExp(escapeRegex(normalized), 'i');
};

module.exports = {
  escapeRegex,
  createSearchRegex
};
