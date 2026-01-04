import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Shield } from 'lucide-react';
import { empresasService } from '../services/api';

const formatCnpj = (value) => {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const SstDashboard = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const response = await empresasService.getAll();
      setEmpresas(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas para o Dashboard SST:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmpresas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return empresas;

    return empresas.filter((empresa) => {
      const nome = String(empresa.nome || '').toLowerCase();
      const cnpj = String(empresa.cnpj || '');
      const cnae = String(empresa.cnae || '');
      return nome.includes(term) || cnpj.includes(term) || cnae.includes(term);
    });
  }, [empresas, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard SST</h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecione uma empresa para visualizar indicadores, pendências e não conformidades por NR.
          </p>
        </div>
        <Link to="/empresas" className="btn-secondary flex items-center justify-center w-full sm:w-auto">
          <Building2 className="h-4 w-4 mr-2" />
          Empresas
        </Link>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou CNAE..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {filteredEmpresas.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma empresa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {empresas.length === 0 ? 'Cadastre uma empresa para gerar o Dashboard SST.' : 'Tente ajustar sua busca.'}
          </p>
          <div className="mt-6">
            <Link to="/empresas" className="btn-primary">
              Cadastrar empresa
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmpresas.map((empresa) => (
            <div key={empresa.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">{empresa.nome}</h3>
                    <p className="text-sm text-gray-500">{formatCnpj(empresa.cnpj)}</p>
                    <p className="text-xs text-gray-500">CNAE: {empresa.cnae || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  to={`/empresas/${empresa.id}/sst`}
                  className="btn-primary flex items-center justify-center w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Abrir Dashboard SST
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SstDashboard;

