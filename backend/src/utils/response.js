const sendSuccess = (res, { data = null, message = '', meta = {} } = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
    meta
  });
};

const sendError = (res, { message = 'Erro interno', meta = {} } = {}, status = 500) => {
  return res.status(status).json({
    success: false,
    data: null,
    message,
    meta
  });
};

module.exports = {
  sendSuccess,
  sendError
};

