const { assertDocumentType } = require('../types/contracts');

class DocumentRegistry {
  constructor(definitions = []) {
    this.definitions = new Map();
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition = {}) {
    const type = assertDocumentType(definition.type || definition?.builder?.type);
    if (!definition.builder || typeof definition.builder.build !== 'function') {
      throw new Error(`Builder invalido para o tipo documental ${type}`);
    }
    if (!definition.template || typeof definition.template.render !== 'function') {
      throw new Error(`Template invalido para o tipo documental ${type}`);
    }

    this.definitions.set(type, {
      ...definition,
      type
    });

    return this;
  }

  get(type) {
    const normalized = assertDocumentType(type);
    const definition = this.definitions.get(normalized);
    if (!definition) {
      throw new Error(`Definicao documental nao registrada para ${normalized}`);
    }
    return definition;
  }

  list() {
    return [...this.definitions.values()].map((definition) => ({
      type: definition.type,
      title: definition.builder?.meta?.title || definition.type,
      formalTitle: definition.builder?.meta?.formalTitle || definition.builder?.meta?.title || definition.type,
      description: definition.builder?.meta?.description || '',
      category: definition.builder?.meta?.category || 'generic',
      template: definition.template?.meta?.title || 'Template HTML base'
    }));
  }
}

module.exports = {
  DocumentRegistry
};
