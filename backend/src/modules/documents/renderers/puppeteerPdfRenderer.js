const { getBrowser } = require('./browserPool');

const renderPdf = async ({ html, headerTemplate = '', footerTemplate = '', pdfOptions = {}, options = {}, deps = {} }) => {
  const browser = deps.browser || await getBrowser();
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
  }
};

module.exports = {
  renderPdf
};
