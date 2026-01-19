import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Building2,
  CheckSquare,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { empresasService, tarefasService, riscosService, alertasService } from '../services/api';

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    empresas: [],
    tarefas: [],
    riscos: [],
    alertas: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [empresasRes, tarefasRes, riscosRes, alertasRes] = await Promise.all([
        empresasService.getAll(),
        tarefasService.getAll(),
        riscosService.getAll(),
        alertasService.getAll()
      ]);

      setStats({
        empresas: empresasRes.data.data,
        tarefas: tarefasRes.data.data,
        riscos: riscosRes.data.data,
        alertas: alertasRes.data.data
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados para gráficos
  const conformidadeData = [
    { name: 'Em Dia', value: stats.empresas.filter(e => e.conformidade === 'em_dia').length, color: '#10B981' },
    { name: 'Atrasado', value: stats.empresas.filter(e => e.conformidade === 'atrasado').length, color: '#EF4444' },
    { name: 'Pendente', value: stats.empresas.filter(e => e.conformidade === 'pendente').length, color: '#F59E0B' }
  ];

  const tarefasStatusData = [
    { name: 'Pendente', value: stats.tarefas.filter(t => t.status === 'pendente').length },
    { name: 'Em Andamento', value: stats.tarefas.filter(t => t.status === 'em_andamento').length },
    { name: 'Concluída', value: stats.tarefas.filter(t => t.status === 'concluido').length }
  ];

  const tarefasPrioridadeData = [
    { name: 'Alta', value: stats.tarefas.filter(t => t.prioridade === 'alta').length },
    { name: 'Média', value: stats.tarefas.filter(t => t.prioridade === 'media').length },
    { name: 'Baixa', value: stats.tarefas.filter(t => t.prioridade === 'baixa').length }
  ];

  const riscosTipoData = [
    { name: 'Físico', value: stats.riscos.filter(r => r.tipo === 'Físico').length },
    { name: 'Químico', value: stats.riscos.filter(r => r.tipo === 'Químico').length },
    { name: 'Biológico', value: stats.riscos.filter(r => r.tipo === 'Biológico').length },
    { name: 'Ergonômico', value: stats.riscos.filter(r => r.tipo === 'Ergonômico').length },
    { name: 'Acidente', value: stats.riscos.filter(r => r.tipo === 'Acidente').length }
  ];

  const empresasComPendencias = stats.empresas
    .filter(e => e.pendencias > 0)
    .sort((a, b) => b.pendencias - a.pendencias)
    .slice(0, 5);

  const tarefasVencidas = stats.tarefas.filter(t => {
    const hoje = new Date();
    const vencimento = new Date(t.dataVencimento);
    return vencimento < hoje && t.status !== 'concluido';
  });

  const COLORS = ['#8FFC45', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Análises e métricas da plataforma de segurança do trabalho
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total de Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.empresas.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total de Tarefas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.tarefas.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Riscos Identificados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.riscos.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Alertas Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.alertas.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conformidade das Empresas */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conformidade das Empresas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conformidadeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  paddingAngle={2}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {conformidadeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status das Tarefas */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status das Tarefas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tarefasStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8FFC45" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prioridade das Tarefas */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Prioridade das Tarefas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tarefasPrioridadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tipos de Riscos */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Riscos Identificados</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riscosTipoData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empresas com Mais Pendências */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Empresas com Mais Pendências</h3>
          <div className="space-y-3">
            {empresasComPendencias.map((empresa, index) => (
              <div key={empresa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">{index + 1}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{empresa.nome}</p>
                    <p className="text-xs text-gray-500">{empresa.cnpj}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{empresa.pendencias}</p>
                  <p className="text-xs text-gray-500">pendências</p>
                </div>
              </div>
            ))}
            {empresasComPendencias.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhuma empresa com pendências encontrada.
              </p>
            )}
          </div>
        </div>

        {/* Tarefas Vencidas */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tarefas Vencidas</h3>
          <div className="space-y-3">
            {tarefasVencidas.map((tarefa) => (
              <div key={tarefa.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tarefa.titulo}</p>
                  <p className="text-xs text-gray-500">{tarefa.empresaNome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    {new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500">vencimento</p>
                </div>
              </div>
            ))}
            {tarefasVencidas.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhuma tarefa vencida encontrada.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Visão Geral de Conformidade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {stats.empresas.filter(e => e.conformidade === 'em_dia').length}
            </div>
            <div className="text-sm text-gray-600">Empresas em Conformidade</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.empresas.length > 0 
                ? `${Math.round((stats.empresas.filter(e => e.conformidade === 'em_dia').length / stats.empresas.length) * 100)}% do total`
                : '0%'
              }
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {stats.empresas.filter(e => e.conformidade === 'atrasado').length}
            </div>
            <div className="text-sm text-gray-600">Empresas Atrasadas</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.empresas.length > 0 
                ? `${Math.round((stats.empresas.filter(e => e.conformidade === 'atrasado').length / stats.empresas.length) * 100)}% do total`
                : '0%'
              }
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">
              {stats.tarefas.filter(t => {
                const hoje = new Date();
                const vencimento = new Date(t.dataVencimento);
                return vencimento < hoje && t.status !== 'concluido';
              }).length}
            </div>
            <div className="text-sm text-gray-600">Tarefas Vencidas</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.tarefas.length > 0 
                ? `${Math.round((stats.tarefas.filter(t => {
                    const hoje = new Date();
                    const vencimento = new Date(t.dataVencimento);
                    return vencimento < hoje && t.status !== 'concluido';
                  }).length / stats.tarefas.length) * 100)}% do total`
                : '0%'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
