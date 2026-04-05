const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderList = (rows = []) =>
  rows.length ? `<ul>${rows.map((row) => `<li>${escapeHtml(row)}</li>`).join('')}</ul>` : '<p>Sem dados disponiveis.</p>';

const renderTable = ({ columns = [], rows = [] }) => {
  if (!rows.length) return '<p>Sem registros disponiveis.</p>';

  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeHtml(column.render ? column.render(row) : row[column.key] ?? '')}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
};

module.exports = {
  escapeHtml,
  renderList,
  renderTable
};
