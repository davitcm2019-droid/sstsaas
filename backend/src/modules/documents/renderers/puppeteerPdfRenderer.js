const DEFAULT_LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'];

const loadPuppeteer = () => {
  try {
    return require('puppeteer');
  } catch (error) {
    error.message = `Dependencia puppeteer nao encontrada. Instale-a no backend antes de gerar PDFs. Detalhe: ${error.message}`;
    throw error;
  }
};

const createBrowser = async (deps = {}) => {
  if (deps.browser) return { browser: deps.browser, shouldClose: false };

  const puppeteer = deps.puppeteer || loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: deps.headless ?? process.env.PUPPETEER_HEADLESS !== 'false',
    executablePath: deps.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: deps.launchArgs || DEFAULT_LAUNCH_ARGS
  });

  return { browser, shouldClose: true };
};

const renderPdf = async ({ html, headerTemplate = '', footerTemplate = '', pdfOptions = {}, options = {}, deps = {} }) => {
  const { browser, shouldClose } = await createBrowser(deps);
  const page = deps.page || (await browser.newPage());

  try {
    await page.setContent(html, {
      waitUntil: options.waitUntil || 'networkidle0',
      timeout: options.timeoutMs || 30000
    });
    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('screen');
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '110px',
        right: '24px',
        bottom: '80px',
        left: '24px'
      },
      ...pdfOptions
    });

    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    if (!deps.page && typeof page.close === 'function') {
      await page.close().catch(() => {});
    }
    if (shouldClose && typeof browser.close === 'function') {
      await browser.close().catch(() => {});
    }
  }
};

module.exports = {
  renderPdf
};
