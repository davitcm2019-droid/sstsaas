import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  MapPin,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import FormModal from '../components/FormModal';
import EmpresaForm from '../components/forms/EmpresaForm';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
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

const formatDate = (value) => {
  if (!value) return 'Sem atualizacao';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem atualizacao';
  return date.toLocaleDateString('pt-BR');
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
    void loadEmpresas();
  }, [searchTerm, filters]);

  useEffect(() => {
    void loadCnaes();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const response = await empresasService.getAll({ search: searchTerm, ...filters });
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

  const metrics = useMemo(() => {
    const ativas = empresas.filter((empresa) => empresa.status === 'ativa').length;
    const atrasadas = empresas.filter((empresa) => empresa.conformidade === 'atrasado').length;
    const comPendencia = empresas.filter((empresa) => Number(empresa.pendencias) > 0).length;

    return {
      total: empresas.length,
      ativas,
      atrasadas,
      comPendencia
    };
  }, [empresas]);

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
        window.alert('Ha linhas sem campos obrigatorios: nome, documento e status.');
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

    const validCnae = cnaeOptions.length > 0 ? cnaeOptions.some((item) => item.code === cnae) : true;
    if (!validCnae) {
      window.alert('Secao CNAE nao encontrada na lista permitida.');
      return;
    }

    try {
      setSavingCnaeId(empresaId);
      await empresasService.update(empresaId, { cnae });

      setLastImported((prev) => prev.map((empresa) => (empresa.id === empresaId ? { ...empresa, cnae } : empresa)));
      setEmpresas((prev) => prev.map((empresa) => (empresa.id === empresaId ? { ...empresa, cnae } : empresa)));
    } catch (error) {
      console.error('Erro ao atualizar CNAE:', error);
      window.alert(error?.response?.data?.message || 'Falha ao salvar o CNAE.');
    } finally {
      setSavingCnaeId('');
    }
  };

  const getConformidadeBadge = (conformidade) => {
    switch (conformidade) {
      case 'em_dia':
        return <span className="status-badge status-success">Em dia</span>;
      case 'atrasado':
        return <span className="status-badge status-danger">Atrasado</span>;
      default:
        return <span className="status-badge status-warning">Em ajuste</span>;
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();

    if (normalizedStatus === 'inativo' || normalizedStatus === 'inativa') {
      return <span className="status-badge status-danger">Inativa</span>;
    }

    return <span className="status-badge status-success">Ativa</span>;
  };

  const hasActiveFilters = Boolean(searchTerm || filters.status || filters.conformidade);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-lime-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Carteira de clientes"
        title="Empresas organizadas para leitura tecnica."
        description="Filtre a carteira, acompanhe conformidade, importe cadastros e avance para o detalhe operacional sem dispersao visual."
        actions={
          <>
            <button type="button" onClick={handleDownloadTemplate} className="btn-secondary">
              <Download className="h-4 w-4" />
              Modelo
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary" disabled={importing}>
              <Upload className="h-4 w-4" />
              {importing ? 'Importando...' : 'Importar planilha'}
            </button>
            <button type="button" onClick={handleCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nova empresa
            </button>
          </>
        }
      >
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-3 text-slate-200">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome, documento ou ramo"
                className="w-full border-0 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="input-field bg-white/90"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <select
              className="input-field bg-white/90"
              value={filters.conformidade}
              onChange={(event) => setFilters((prev) => ({ ...prev, conformidade: event.target.value }))}
            >
              <option value="">Todas as conformidades</option>
              <option value="em_dia">Em dia</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>
      </PageHeader>

      <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Empresas filtradas" value={metrics.total} meta="Carteira atual" tone="blue" />
        <MetricCard icon={CheckCircle} label="Ativas" value={metrics.ativas} meta="Com acesso operacional" tone="lime" />
        <MetricCard icon={AlertTriangle} label="Em atraso" value={metrics.atrasadas} meta="Exigem priorizacao" tone="rose" />
        <MetricCard icon={Clock} label="Com pendencias" value={metrics.comPendencia} meta="Demandas abertas" tone="amber" />
      </section>

      {lastImported.length > 0 ? (
        <section className="panel-surface p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Ultimo upload</p>
              <h2 className="mt-1 text-xl text-slate-900">Revisao rapida de importacao</h2>
            </div>
            <span className="status-badge status-info">{lastImported.length} linhas importadas</span>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Status</th>
                  <th>Secao CNAE</th>
                </tr>
              </thead>
              <tbody>
                {lastImported.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className="font-semibold text-slate-900">{empresa.nome}</td>
                    <td>{formatDocumento(empresa.cnpj)}</td>
                    <td>{empresa.status === 'inativo' ? 'Inativa' : 'Ativa'}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="input-field h-11 min-w-[12rem]"
                          placeholder={getDisplayCnae(empresa.cnae)}
                          value={cnaeDrafts[empresa.id] || ''}
                          list="cnae-catalog-options"
                          onChange={(event) =>
                            setCnaeDrafts((prev) => ({ ...prev, [empresa.id]: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCnae(empresa.id)}
                          className="btn-secondary"
                          disabled={savingCnaeId === empresa.id}
                        >
                          {savingCnaeId === empresa.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {loadingCnaes ? 'Carregando secoes CNAE...' : 'Associe a secao correta antes de seguir para a operacao.'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <datalist id="cnae-catalog-options">
        {cnaeOptions.map((item) => (
          <option key={item.code} value={item.code}>
            {item.divisionRange ? `${item.divisionRange} | ${item.description}` : item.description}
          </option>
        ))}
      </datalist>

      <section className="panel-surface p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Lista principal</p>
            <h2 className="mt-1 text-xl text-slate-900">Leitura consolidada da carteira</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-badge status-info">{metrics.total} empresas visiveis</span>
            <span className="status-badge status-warning">{metrics.comPendencia} com pendencias</span>
            {hasActiveFilters ? <span className="status-badge status-success">Filtros aplicados</span> : null}
          </div>
        </div>

        {empresas.length > 0 ? (
          <div className="table-shell company-table-shell">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Documento</th>
                  <th>Status</th>
                  <th>Conformidade</th>
                  <th>CNAE</th>
                  <th>Responsavel</th>
                  <th>Pendencias</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td>
                      <div className="company-table__identity">
                        <div className="company-table__mark">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="company-table__copy">
                          <p className="company-table__name">{empresa.nome}</p>
                          <p className="company-table__subline">{empresa.ramo || 'Ramo nao informado'}</p>
                          <div className="company-table__meta">
                            <span>
                              <MapPin className="h-3.5 w-3.5" />
                              {empresa.cidade || 'Cidade nao informada'}
                            </span>
                            <span>
                              <Clock className="h-3.5 w-3.5" />
                              Atualizado em {formatDate(empresa.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="company-table__stack">
                        <strong>{formatDocumento(empresa.cnpj)}</strong>
                        <span>{empresa.email || 'Sem email principal'}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(empresa.status)}</td>
                    <td>{getConformidadeBadge(empresa.conformidade)}</td>
                    <td>
                      <div className="company-table__stack">
                        <strong>{getDisplayCnae(empresa.cnae)}</strong>
                        <span>Secao principal vinculada</span>
                      </div>
                    </td>
                    <td>
                      <div className="company-table__stack">
                        <strong>{empresa.responsavel || 'Sem responsavel definido'}</strong>
                        <span className="company-table__inline-meta">
                          <User className="h-3.5 w-3.5" />
                          Contato operacional
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="company-table__signals">
                        <div className="company-table__signal company-table__signal--danger">
                          <strong>{empresa.pendencias || 0}</strong>
                          <span>Pendencias</span>
                        </div>
                        <div className="company-table__signal company-table__signal--warning">
                          <strong>{empresa.alertas || 0}</strong>
                          <span>Alertas</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="company-table__actions">
                        <Link to={`/empresas/${empresa.id}`} className="btn-secondary">
                          <Eye className="h-4 w-4" />
                          Detalhe
                        </Link>
                        <Link to={`/empresas/${empresa.id}/sst`} className="btn-primary">
                          <Shield className="h-4 w-4" />
                          SST
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEdit(empresa)}
                          className="company-table__icon-button"
                          aria-label={`Editar ${empresa.nome}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(empresa.id)}
                          className="company-table__icon-button company-table__icon-button--danger"
                          aria-label={`Excluir ${empresa.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa encontrada"
            description={
              searchTerm || Object.values(filters).some((value) => value)
                ? 'Ajuste os filtros para ampliar a carteira exibida.'
                : 'Comece criando a primeira empresa da sua operacao.'
            }
            action={
              !searchTerm && !Object.values(filters).some((value) => value) ? (
                <button type="button" onClick={handleCreate} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Nova empresa
                </button>
              ) : null
            }
          />
        )}
      </section>

      <FormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedEmpresa(null);
        }}
        title={selectedEmpresa ? 'Editar empresa' : 'Nova empresa'}
        showFooter={false}
        asForm={false}
      >
        <EmpresaForm
          empresa={selectedEmpresa}
          onSave={() => {
            void loadEmpresas();
            setShowModal(false);
            setSelectedEmpresa(null);
          }}
          onCancel={() => {
            setShowModal(false);
            setSelectedEmpresa(null);
          }}
        />
      </FormModal>
    </div>
  );
};

export default Empresas;
