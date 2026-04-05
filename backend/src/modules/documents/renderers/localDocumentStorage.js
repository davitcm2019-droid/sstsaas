const fs = require('fs/promises');
const path = require('path');

class LocalDocumentStorage {
  constructor(baseDir = path.join(process.cwd(), 'tmp', 'generated-documents')) {
    this.baseDir = baseDir;
  }

  async save({ buffer, fileName, documentType }) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const targetDir = path.join(this.baseDir, documentType || 'generic', dateKey);
    await fs.mkdir(targetDir, { recursive: true });
    const absolutePath = path.join(targetDir, fileName);
    await fs.writeFile(absolutePath, buffer);

    return {
      fileName,
      absolutePath,
      relativePath: path.relative(process.cwd(), absolutePath),
      size: buffer.length
    };
  }
}

module.exports = {
  LocalDocumentStorage
};
