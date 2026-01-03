const { config } = require('../config');

const sanitizeDigits = (value = '') => String(value).replace(/\D/g, '');

const ensureConfigured = () => {
  const required = [
    ['CONECTA_GOV_TOKEN_URL', config.conectaGov?.tokenUrl],
    ['CONECTA_GOV_CNPJ_URL', config.conectaGov?.cnpjUrl],
    ['CONECTA_GOV_CLIENT_ID', config.conectaGov?.clientId],
    ['CONECTA_GOV_CLIENT_SECRET', config.conectaGov?.clientSecret]
  ];

  const missing = required.filter(([, value]) => typeof value !== 'string' || value.trim() === '').map(([name]) => name);
  if (missing.length > 0) {
    const err = new Error(`Missing Conecta GOV configuration: ${missing.join(', ')}`);
    err.code = 'CONECTA_NOT_CONFIGURED';
    err.statusCode = 500;
    throw err;
  }
};

const buildBasicAuthHeader = (clientId, clientSecret) => {
  const raw = `${clientId}:${clientSecret}`;
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  return `Basic ${encoded}`;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  if (typeof fetch !== 'function') {
    const err = new Error('Global fetch is not available in this Node.js runtime');
    err.code = 'FETCH_NOT_AVAILABLE';
    err.statusCode = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
let inflightTokenPromise = null;

const requestAccessToken = async () => {
  ensureConfigured();

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');

  const scope = config.conectaGov.scope;
  if (typeof scope === 'string' && scope.trim() !== '') {
    params.set('scope', scope.trim());
  }

  const response = await fetchWithTimeout(
    config.conectaGov.tokenUrl,
    {
      method: 'POST',
      headers: {
        Authorization: buildBasicAuthHeader(config.conectaGov.clientId, config.conectaGov.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: params.toString()
    },
    config.conectaGov.timeoutMs
  );

  if (!response.ok) {
    const err = new Error(`Conecta GOV token request failed with status ${response.status}`);
    err.code = 'CONECTA_AUTH_FAILED';
    err.statusCode = 502;
    throw err;
  }

  const payload = await response.json().catch(() => null);
  const accessToken = payload?.access_token;
  const expiresIn = Number(payload?.expires_in);

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    const err = new Error('Conecta GOV token response is missing access_token');
    err.code = 'CONECTA_AUTH_INVALID_RESPONSE';
    err.statusCode = 502;
    throw err;
  }

  const ttlMs = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 3600 * 1000;
  cachedAccessToken = accessToken.trim();
  cachedAccessTokenExpiresAt = Date.now() + ttlMs;

  return cachedAccessToken;
};

const getAccessToken = async () => {
  const hasValidToken = cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000;
  if (hasValidToken) return cachedAccessToken;

  if (!inflightTokenPromise) {
    inflightTokenPromise = requestAccessToken().finally(() => {
      inflightTokenPromise = null;
    });
  }

  return inflightTokenPromise;
};

const buildCnpjUrl = (template, cnpj) => {
  const trimmed = String(template || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('{cnpj}')) {
    return trimmed.replace('{cnpj}', encodeURIComponent(cnpj));
  }

  if (trimmed.endsWith('/')) {
    return `${trimmed}${encodeURIComponent(cnpj)}`;
  }

  return `${trimmed}/${encodeURIComponent(cnpj)}`;
};

const normalizeCnaeCode = (rawCode) => {
  if (!rawCode) return '';

  const raw = String(rawCode).trim();
  if (!raw) return '';

  if (/^\d{4}-\d$/.test(raw)) return raw;

  const digits = sanitizeDigits(raw);
  if (digits.length < 5) return raw;

  const classDigits = digits.slice(0, 5);
  return `${classDigits.slice(0, 4)}-${classDigits.slice(4)}`;
};

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const normalizeResponse = (payload) => {
  const razaoSocial = payload?.razao_social || payload?.razaoSocial || payload?.nome_empresarial || '';
  const cnpj = sanitizeDigits(payload?.cnpj || '');

  const cnaeCodigoRaw = payload?.cnae_principal?.codigo ?? payload?.cnae_principal_codigo;
  const cnaeDescricao = payload?.cnae_principal?.descricao ?? payload?.cnae_principal_descricao ?? '';

  const logradouro = payload?.logradouro || '';
  const numero = payload?.numero || '';
  const bairro = payload?.bairro || '';

  const addressParts = [logradouro, numero && `nº ${numero}`, bairro && `- ${bairro}`].filter(Boolean);
  const endereco = addressParts.join(' ').trim();

  const cidade = payload?.municipio?.nome || payload?.municipio || '';
  const estado = payload?.uf || payload?.estado || '';
  const cep = sanitizeDigits(payload?.cep || '');

  const ddd = sanitizeDigits(payload?.ddd_telefone_1 || payload?.ddd || '');
  const telefoneNumero = sanitizeDigits(payload?.telefone_1 || payload?.telefone || payload?.telefone1 || '');
  const telefone = ddd && telefoneNumero ? `${ddd}${telefoneNumero}` : telefoneNumero || ddd;

  const email = normalizeEmail(payload?.email || '');

  const responsavel =
    payload?.qsa?.[0]?.nome_socio ||
    payload?.qsa?.[0]?.nome ||
    payload?.qsa?.[0]?.nome_socio || // fallback
    '';

  return {
    nome: String(razaoSocial || '').trim(),
    cnpj,
    cnae: normalizeCnaeCode(cnaeCodigoRaw),
    ramo: String(cnaeDescricao || '').trim(),
    endereco,
    cidade: String(cidade || '').trim(),
    estado: String(estado || '').trim(),
    cep,
    telefone,
    email,
    responsavel: String(responsavel || '').trim()
  };
};

const lookupCnpj = async (cnpj) => {
  ensureConfigured();

  const digits = sanitizeDigits(cnpj);
  if (digits.length !== 14) {
    const err = new Error('CNPJ inválido');
    err.code = 'CNPJ_INVALID';
    err.statusCode = 400;
    throw err;
  }

  const url = buildCnpjUrl(config.conectaGov.cnpjUrl, digits);
  if (!url) {
    const err = new Error('Conecta GOV CNPJ endpoint is not configured');
    err.code = 'CONECTA_NOT_CONFIGURED';
    err.statusCode = 500;
    throw err;
  }

  const request = async () => {
    const token = await getAccessToken();

    return fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      },
      config.conectaGov.timeoutMs
    );
  };

  let response = await request();

  if (response.status === 401 || response.status === 403) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
    response = await request();
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const err = new Error(`Conecta GOV CNPJ lookup failed with status ${response.status}`);
    err.code = 'CONECTA_API_ERROR';
    err.statusCode = 502;
    throw err;
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    const err = new Error('Conecta GOV CNPJ response is not valid JSON');
    err.code = 'CONECTA_API_INVALID_RESPONSE';
    err.statusCode = 502;
    throw err;
  }

  return normalizeResponse(payload);
};

module.exports = {
  lookupCnpj
};

