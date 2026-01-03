import { useEffect, useMemo, useState } from 'react';
import FormModal from './FormModal';
import { empresasService, checklistsService } from '../services/api';
import cnaeData from '../checklists/listacnae.json';
import cnaeNrMapping from '../checklists/mapeamento_CNAE_NR.json';

const checklistTemplateModules = import.meta.glob('../checklists/checklist_NR*.json', { eager: true });

const checklistTemplatesByNr = Object.values(checklistTemplateModules).reduce((acc, mod) => {
  const data = mod?.default || mod;
  if (data?.nr) acc[data.nr] = data;
  return acc;
}, {});

const cnaeSectionByCode = (() => {
  const map = new Map();

  cnaeData.cnaes.forEach((secao) => {
    secao.divisoes.forEach((divisao) => {
      divisao.grupos.forEach((grupo) => {
        grupo.classes.forEach((classe) => {
          map.set(classe.codigo_classe, secao.secao);
        });
      });
    });
  });

  return map;
})();

const getCategoryByNr = (nrCode) => {
  const num = Number.parseInt(String(nrCode).replace(/\D/g, ''), 10);
  if (num === 6) return 'epi';
  if (num === 12) return 'maquinas';
  if (num === 18) return 'construcao';
  return 'geral';
};

const buildChecklistPayload = (template) => {
  const version = template?.version?.date || '1.0';
  const items = Array.isArray(template?.checklist_questions) ? template.checklist_questions : [];

  return {
    name: `${template.nr} - ${template.title}`,
    description: template.title,
    category: getCategoryByNr(template.nr),
    version,
    active: true,
    items: items.map((question) => ({
      id: question.id,
      question: question.question,
      type: 'boolean',
      required: true,
      weight: 10,
      options: [
        { value: true, label: 'Conforme', score: 10 },
        { value: false, label: 'Não conforme', score: 0 }
      ],
      observations: ''
    }))
  };
};

const CreateChecklistModal = ({ isOpen, onClose, onCreated }) => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNrs, setSelectedNrs] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setEmpresaId('');
    setSelectedNrs([]);

    const loadEmpresas = async () => {
      try {
        setLoadingEmpresas(true);
        const response = await empresasService.getAll();
        setEmpresas(response?.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao carregar empresas');
      } finally {
        setLoadingEmpresas(false);
      }
    };

    loadEmpresas();
  }, [isOpen]);

  const selectedEmpresa = useMemo(() => {
    if (!empresaId) return null;
    const parsedId = Number.parseInt(empresaId, 10);
    return empresas.find((empresa) => empresa.id === parsedId) || null;
  }, [empresaId, empresas]);

  const cnaeSection = useMemo(() => {
    if (!selectedEmpresa?.cnae) return null;
    return cnaeSectionByCode.get(selectedEmpresa.cnae) || null;
  }, [selectedEmpresa]);

  const nrInfo = useMemo(() => {
    if (!cnaeSection) {
      return {
        nrs: [],
        available: [],
        missing: [],
        mappingDescription: ''
      };
    }

    const entry = cnaeNrMapping.mapping.find((m) => m.cnae_secao === cnaeSection);
    const nrs = entry?.nrs_relacionadas || [];
    const available = nrs.filter((nr) => Boolean(checklistTemplatesByNr[nr]));
    const missing = nrs.filter((nr) => !checklistTemplatesByNr[nr]);

    return {
      nrs,
      available,
      missing,
      mappingDescription: entry?.descricao || ''
    };
  }, [cnaeSection]);

  useEffect(() => {
    setSelectedNrs(nrInfo.available);
  }, [nrInfo.available.join('|')]);

  const toggleNr = (nr) => {
    setSelectedNrs((current) => {
      if (current.includes(nr)) return current.filter((item) => item !== nr);
      return [...current, nr];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedEmpresa) {
      setError('Selecione uma empresa para gerar os checklists.');
      return;
    }

    if (!selectedEmpresa.cnae) {
      setError('A empresa selecionada não possui CNAE.');
      return;
    }

    if (!selectedNrs.length) {
      setError('Selecione pelo menos uma NR para gerar o checklist.');
      return;
    }

    try {
      setSubmitting(true);

      for (const nr of selectedNrs) {
        const template = checklistTemplatesByNr[nr];
        if (!template) continue;
        await checklistsService.createChecklist(buildChecklistPayload(template));
      }

      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar checklists');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Checklist (por CNAE → NR)"
      onSubmit={handleSubmit}
      submitText={submitting ? 'Gerando...' : 'Gerar checklists'}
      loading={submitting}
      error={error}
    >
      {loadingEmpresas ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="text-sm text-gray-600">
          Nenhuma empresa cadastrada. Crie uma empresa primeiro para gerar checklists por CNAE.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              className="input-field"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome} ({empresa.cnae})
                </option>
              ))}
            </select>
          </div>

          {selectedEmpresa && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div>
                <span className="font-medium">CNAE:</span> {selectedEmpresa.cnae}
              </div>
              <div>
                <span className="font-medium">Seção:</span> {cnaeSection || '—'}{' '}
                {nrInfo.mappingDescription ? `(${nrInfo.mappingDescription})` : ''}
              </div>
              {!!nrInfo.missing.length && (
                <div className="mt-2 text-xs text-amber-700">
                  Templates não encontrados para: {nrInfo.missing.join(', ')}
                </div>
              )}
            </div>
          )}

          {selectedEmpresa && nrInfo.available.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">NRs aplicáveis</label>
                <button
                  type="button"
                  className="text-xs text-primary-600 hover:text-primary-700"
                  onClick={() => setSelectedNrs(nrInfo.available)}
                >
                  Selecionar todas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nrInfo.available.map((nr) => {
                  const template = checklistTemplatesByNr[nr];
                  const checked = selectedNrs.includes(nr);

                  return (
                    <label
                      key={nr}
                      className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${
                        checked ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleNr(nr)}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{nr}</div>
                        <div className="text-xs text-gray-600">{template?.title || 'Template'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {selectedEmpresa && nrInfo.available.length === 0 && (
            <div className="text-sm text-gray-600">
              Nenhum template de checklist encontrado para as NRs aplicáveis deste CNAE.
            </div>
          )}
        </div>
      )}
    </FormModal>
  );
};

export default CreateChecklistModal;

