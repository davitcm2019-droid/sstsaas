const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

let _instance = null;
let _idleTimer = null;
let _launching = null;

const isProduction = () => (process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const loadPuppeteer = () => {
  try {
    return require('puppeteer');
  } catch (error) {
    error.message = `Dependencia puppeteer nao encontrada: ${error.message}`;
    throw error;
  }
};

const loadChromium = () => {
  try {
    return require('@sparticuz/chromium');
  } catch {
    return null;
  }
};

const resolveLaunchOptions = async () => {
  const defaultArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--font-render-hinting=medium'];

  if (!isProduction()) {
    return {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: defaultArgs
    };
  }

  const chromium = loadChromium();
  if (!chromium) {
    return {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: defaultArgs
    };
  }

  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;

  return {
    headless: true,
    executablePath: await chromium.executablePath(),
    args: chromium.args
  };
};

const resetIdleTimer = () => {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    if (_instance) {
      const browser = _instance;
      _instance = null;
      try {
        await browser.close();
      } catch {}
    }
  }, DEFAULT_IDLE_TIMEOUT_MS);
};

const getBrowser = async () => {
  if (_instance) {
    const connected = typeof _instance.isConnected === 'function' ? _instance.isConnected() : true;
    if (connected) {
      resetIdleTimer();
      return _instance;
    }
    _instance = null;
  }

  if (_launching) return _launching;

  _launching = (async () => {
    const puppeteer = loadPuppeteer();
    const options = await resolveLaunchOptions();
    _instance = await puppeteer.launch(options);
    resetIdleTimer();
    return _instance;
  })();

  try {
    return await _launching;
  } finally {
    _launching = null;
  }
};

const shutdown = async () => {
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }
  if (_instance) {
    const browser = _instance;
    _instance = null;
    try {
      await browser.close();
    } catch {}
  }
};

const onExit = () => {
  if (_instance) {
    try {
      _instance.close();
    } catch {}
  }
};

process.on('SIGTERM', onExit);
process.on('SIGINT', onExit);

module.exports = {
  getBrowser,
  shutdown
};
