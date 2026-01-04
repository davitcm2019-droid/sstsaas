const { config } = require('../config');
const { sanitizeCnpj } = require('../utils/cnpj');

const officeCache = new Map();

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

const getCachedOffice = (cnpjDigits) => {
  const entry = officeCache.get(cnpjDigits);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    officeCache.delete(cnpjDigits);
    return null;
  }

  return entry.value;
};

const setCachedOffice = (cnpjDigits, office) => {
  const ttlMs = config.cnpja.cacheTtlSeconds * 1000;
  officeCache.set(cnpjDigits, { value: office, expiresAt: Date.now() + ttlMs });
};

const lookupCnpjOnCnpja = async (cnpjDigits) => {
  const normalizedCnpj = sanitizeCnpj(cnpjDigits);
  const cached = getCachedOffice(normalizedCnpj);
  if (cached) return cached;

  const baseUrl = config.cnpja.apiUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/${normalizedCnpj}`;

  const headers = {
    Accept: 'application/json',
    'User-Agent': config.cnpja.userAgent
  };
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
      if (payload) {
        setCachedOffice(normalizedCnpj, payload);
      }
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
  const taxId = sanitizeCnpj(office?.taxId || office?.tax_id);
  const mainActivity = office?.mainActivity || office?.main_activity;
  const mainActivityCode = normalizeCnae(mainActivity?.code);
  const mainActivityText = normalizeString(mainActivity?.text);

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
  const responsavel = normalizeString(
    office?.company?.members?.[0]?.person?.name || office?.partners?.[0]?.name
  );

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
