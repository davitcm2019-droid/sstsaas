const { config } = require('../config');
const { sendError } = require('../utils/response');

const FEATURE_FLAG_MAP = {
  structured_risk_survey: () => config.features.structuredRiskSurvey
};

const requireFeatureFlag = (flagName) => {
  return (req, res, next) => {
    const resolver = FEATURE_FLAG_MAP[flagName];
    const enabled = typeof resolver === 'function' ? resolver() : false;

    if (!enabled) {
      return sendError(
        res,
        {
          message: 'Recurso não habilitado neste ambiente',
          meta: { code: 'FEATURE_DISABLED', feature: flagName }
        },
        404
      );
    }

    return next();
  };
};

module.exports = {
  requireFeatureFlag
};
