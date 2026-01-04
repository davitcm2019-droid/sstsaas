const { config } = require('../config');
const { sanitizeCnpj } = require('../utils/cnpj');

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
};

const normalizeZip = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return normalizeString(String(value || ''));
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const normalizeUf = (value) => {
  const uf = normalizeString(String(value || '')).toUpperCase();
  if (/^[A-Z]{2}$/.test(uf)) return uf;
  return uf.slice(0, 2);
};

const normalizeCnae = (value) => {
  const raw = normalizeString(String(value || ''));
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 7) {
    return digits.replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3');
  }

  return raw;
};

const getJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const lookupCnpjOnCnpja = async (cnpjDigits) => {
  const normalizedCnpj = sanitizeCnpj(cnpjDigits);
  const baseUrl = config.cnpja.apiUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/${normalizedCnpj}`;

  const headers = { Accept: 'application/json' };
  if (config.cnpja.apiKey) {
    const prefix = config.cnpja.apiKeyPrefix ? `${config.cnpja.apiKeyPrefix} ` : '';
    headers[config.cnpja.apiKeyHeader] = `${prefix}${config.cnpja.apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.cnpja.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    if (response.ok) {
      const payload = await getJsonSafe(response);
      return payload;
    }

    const payload = await getJsonSafe(response);
    const error = new Error(payload?.message || `CNPJA lookup failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Tempo limite ao consultar CNPJA');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mapCnpjaOfficeToEmpresaDTO = (office) => {
  const companyName = normalizeString(office?.company?.name);
  const taxId = sanitizeCnpj(office?.tax_id);
  const mainActivityCode = normalizeCnae(office?.main_activity?.code);
  const mainActivityText = normalizeString(office?.main_activity?.text);

  const street = normalizeString(office?.address?.street);
  const number = normalizeString(office?.address?.number);
  const district = normalizeString(office?.address?.district);

  const streetAndNumber = [street, number].filter(Boolean).join(', ');
  const endereco = [streetAndNumber, district].filter(Boolean).join(' - ');

  const cidade = normalizeString(office?.address?.city);
  const estado = normalizeUf(office?.address?.state);
  const cep = normalizeZip(office?.address?.zip);

  const telefone = normalizePhone(office?.phones?.[0]?.number);
  const email = normalizeString(office?.emails?.[0]?.address);
  const responsavel = normalizeString(office?.partners?.[0]?.name);

  return {
    nome: companyName,
    cnpj: taxId,
    cnae: mainActivityCode,
    ramo: mainActivityText,
    endereco,
    cidade,
    estado,
    cep,
    telefone,
    email,
    responsavel
  };
};

module.exports = {
  lookupCnpjOnCnpja,
  mapCnpjaOfficeToEmpresaDTO
};
