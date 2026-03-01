import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import FormModal from '../components/FormModal';
import EmpresaForm from '../components/forms/EmpresaForm';
import { empresasService } from '../services/api';

const REQUIRED_IMPORT_FIELDS = ['nome', 'documento', 'status'];

const normalizeHeader = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const COLUMN_ALIASES = {
  nome: ['nome', 'nome_da_empresa', 'razao_social', 'razao', 'empresa'],
  documento: ['documento', 'cnpj_ou_cpf', 'cnpj', 'cpf'],
  status: ['status', 'situacao']
};

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'ativa' || normalized === 'ativo') return 'ativa';
  if (normalized === 'inativa' || normalized === 'inativo') return 'inativa';
  return '';
};

const formatDocumento = (value) => {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
};

const mapSpreadsheetRow = (row) => {
  const normalizedRow = Object.entries(row).reduce((acc, [key, val]) => {
    acc[normalizeHeader(key)] = val;
    return acc;
  }, {});

  const mapped = Object.entries(COLUMN_ALIASES).reduce((acc, [target, aliases]) => {
    const found = aliases.find((alias) => normalizedRow[alias] !== undefined && normalizedRow[alias] !== '');
    if (found) acc[target] = normalizedRow[found];
    return acc;
  }, {});

  return {
    ...mapped,
    status: normalizeStatus(mapped.status)
  };
};

const getDisplayCnae = (value) => {
  if (!value || String(value).trim().toUpperCase() === 'A_DEFINIR') return 'A definir';
  return value;
};

const normalizeCnaeCode = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const sectionMatch = raw.match(/^([A-U])(?:\b|[\s\-|])/);
  if (sectionMatch) return sectionMatch[1];
  if (/^[A-U]$/.test(raw)) return raw;
  return raw.split('/')[0].trim();
};

const Empresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', conformidade: '' });
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [lastImported, setLastImported] = useState([]);
  const [cnaeDrafts, setCnaeDrafts] = useState({});
  const [savingCnaeId, setSavingCnaeId] = useState('');
  const [cnaeOptions, setCnaeOptions] = useState([]);
  const [loadingCnaes, setLoadingCnaes] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEmpresas();
  }, [searchTerm, filters]);

  useEffect(() => {
    loadCnaes();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const params = { search: searchTerm, ...filters };
      const response = await empresasService.getAll(params);
      setEmpresas(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCnaes = async () => {
    try {
      setLoadingCnaes(true);
      const response = await empresasService.getCnaes();
      setCnaeOptions(response.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar catalogo de CNAEs:', error);
      setCnaeOptions([]);
    } finally {
      setLoadingCnaes(false);
    }
  };

  const handleCreate = () => {
    setSelectedEmpresa(null);
    setShowModal(true);
  };

  const handleEdit = (empresa) => {
    setSelectedEmpresa(empresa);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
      await empresasService.delete(id);
      await loadEmpresas();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedEmpresa(null);
  };

  const handleDownloadTemplate = async () => {
    let headers = [...REQUIRED_IMPORT_FIELDS];
    try {
      const response = await empresasService.getImportTemplate();
      const required = response.data?.data?.required;
      if (Array.isArray(required) && required.length > 0) {
        headers = required;
      }
    } catch (error) {
      console.error('Erro ao gerar modelo:', error);
    }

    const worksheet = XLSX.utils.json_to_sheet([{}], { header: headers, skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');
    XLSX.writeFile(workbook, 'modelo_importacao_empresas.xlsx');
  };

  const handleOpenImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows.length) {
        window.alert('A planilha esta vazia.');
        return;
      }

      const mappedRows = rows.map(mapSpreadsheetRow);
      const hasMissingRequired = mappedRows.some((row) =>
        REQUIRED_IMPORT_FIELDS.some((field) => !row[field] || String(row[field]).trim() === '')
      );

      if (hasMissingRequired) {
        window.alert('Ha linhas sem campos obrigatorios: nome, documento (cnpj/cpf) e status.');
        return;
      }

      const response = await empresasService.importSpreadsheet({ empresas: mappedRows });
      const imported = response.data?.data?.imported || [];
      const summary = response.data?.data?.summary;
      const skipped = response.data?.data?.skipped || [];
      const skippedPreview = skipped.slice(0, 5).map((item) => `Linha ${item.line}: ${item.reason}`).join('\n');

      setLastImported(imported);
      setCnaeDrafts(
        imported.reduce((acc, item) => {
          acc[item.id] = item.cnae && item.cnae !== 'A_DEFINIR' ? normalizeCnaeCode(item.cnae) : '';
          return acc;
        }, {})
      );

      window.alert(
        `Importacao concluida.\n` +
          `Total: ${summary?.total ?? mappedRows.length}\n` +
          `Importadas: ${summary?.imported ?? 0}\n` +
          `Ignoradas: ${summary?.skipped ?? 0}` +
          (skippedPreview ? `\n\nPrimeiros erros:\n${skippedPreview}` : '')
      );

      await loadEmpresas();
    } catch (error) {
      console.error('Erro ao importar planilha:', error);
      window.alert(error?.response?.data?.message || 'Falha ao importar planilha.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleSaveCnae = async (empresaId) => {
    const cnae = normalizeCnaeCode(cnaeDrafts[empresaId]);
    if (!cnae) {
      window.alert('Informe a secao CNAE para salvar.');
      return;
    }

    const cnaesLoaded = cnaeOptions.length > 0;
    const validCnae = cnaesLoaded ? cnaeOptions.some((item) => item.code === cnae) : true;
    if (!validCnae) {
      window.alert('Secao CNAE nao encontrada na lista permitida. Selecione uma opcao valida.');
      return;
    }

    try {
      setSavingCnaeId(empresaId);
      await empresasService.update(empresaId, { cnae });

      setLastImported((prev) =>
        prev.map((empresa) => (empresa.id === empresaId ? { ...empresa, cnae } : empresa))
      );
      setEmpresas((prev) =>
        prev.map((empresa) => (empresa.id === empresaId ? { ...empresa, cnae } : empresa))
      );
    } catch (error) {
      console.error('Erro ao atualizar CNAE:', error);
      window.alert(error?.response?.data?.message || 'Falha ao salvar o CNAE.');
    } finally {
      setSavingCnaeId('');
    }
  };

  const getStatusBadge = (conformidade) => {
    switch (conformidade) {
      case 'em_dia':
        return <span className="status-badge status-success">Em dia</span>;
      case 'atrasado':
        return <span className="status-badge status-danger">Atrasado</span>;
      default:
        return <span className="status-badge status-warning">Pendente</span>;
    }
  };

  const getStatusIcon = (conformidade) => {
    switch (conformidade) {
      case 'em_dia':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'atrasado':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie as empresas cadastradas no sistema</p>
          <p className="mt-1 text-xs text-gray-400">
            Planilha: campos obrigatorios `nome`, `documento` (cnpj/cpf) e `status` (ativa/inativa).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Modelo
          </button>
          <button onClick={handleOpenImport} className="btn-secondary flex items-center" disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importando...' : 'Importar Planilha'}
          </button>
          <button onClick={handleCreate} className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {lastImported.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Ultimo upload (lista importada)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Documento</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Seção CNAE (A-U)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lastImported.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className="px-4 py-2">{empresa.nome}</td>
                    <td className="px-4 py-2">{formatDocumento(empresa.cnpj)}</td>
                    <td className="px-4 py-2">{empresa.status === 'inativo' ? 'Inativa' : 'Ativa'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          className="input-field h-9 min-w-[170px]"
                          placeholder={getDisplayCnae(empresa.cnae)}
                          value={cnaeDrafts[empresa.id] || ''}
                          list="cnae-catalog-options"
                          onChange={(event) =>
                            setCnaeDrafts((prev) => ({ ...prev, [empresa.id]: event.target.value }))
                          }
                        />
                        <button
                          onClick={() => handleSaveCnae(empresa.id)}
                          className="btn-secondary h-9 px-3"
                          disabled={savingCnaeId === empresa.id}
                        >
                          {savingCnaeId === empresa.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {loadingCnaes
                          ? 'Carregando secoes CNAE...'
                          : 'Selecione a secao CNAE alinhada ao mapeamento NR.'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <datalist id="cnae-catalog-options">
        {cnaeOptions.map((item) => (
          <option key={item.code} value={item.code}>
            {item.divisionRange ? `${item.divisionRange} | ${item.description}` : item.description}
          </option>
        ))}
      </datalist>

      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, documento ou ramo..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <select
              className="input-field"
              value={filters.conformidade}
              onChange={(event) => setFilters({ ...filters, conformidade: event.target.value })}
            >
              <option value="">Todas as conformidades</option>
              <option value="em_dia">Em dia</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {empresas.map((empresa) => (
          <div key={empresa.id} className="card transition-shadow duration-200 hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center">
                <div className="rounded-lg bg-primary-100 p-2">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{empresa.nome}</h3>
                  <p className="text-sm text-gray-500">{formatDocumento(empresa.cnpj)}</p>
                </div>
              </div>
              {getStatusIcon(empresa.conformidade)}
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">CNAE:</span>
                <span className="font-medium">{getDisplayCnae(empresa.cnae)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ramo:</span>
                <span className="font-medium">{empresa.ramo || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Responsavel:</span>
                <span className="font-medium">{empresa.responsavel || '-'}</span>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="mr-1 h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-600">{empresa.pendencias}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-600">{empresa.alertas}</span>
                </div>
              </div>
              {getStatusBadge(empresa.conformidade)}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link to={`/empresas/${empresa.id}`} className="btn-secondary flex items-center justify-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Link>
                <Link to={`/empresas/${empresa.id}/sst`} className="btn-primary flex items-center justify-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Dashboard SST
                </Link>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => handleEdit(empresa)} className="btn-secondary p-2" title="Editar">
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(empresa.id)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {empresas.length === 0 && (
        <div className="py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma empresa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some((value) => value)
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando uma nova empresa.'}
          </p>
        </div>
      )}

      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
        showFooter={false}
        asForm={false}
      >
        <EmpresaForm
          empresa={selectedEmpresa}
          onSave={() => {
            loadEmpresas();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Empresas;
