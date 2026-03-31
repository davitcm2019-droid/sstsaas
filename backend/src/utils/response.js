const sendSuccess = (res, { data = null, message = '', meta = {} } = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
    meta
  });
};

const sanitizeErrorMeta = (meta = {}, status = 500) => {
  if (!meta || typeof meta !== 'object') return {};

  const sanitized = { ...meta };
  if (status >= 500) {
    delete sanitized.details;
  }

  return sanitized;
};

const sendError = (res, { message = 'Erro interno', meta = {} } = {}, status = 500) => {
  return res.status(status).json({
    success: false,
    data: null,
    message,
    meta: sanitizeErrorMeta(meta, status)
  });
};

module.exports = {
  sendSuccess,
  sendError
};
