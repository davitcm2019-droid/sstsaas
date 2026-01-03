import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Camera,
  FileText,
  Clock,
  User,
  DollarSign,
  Calendar,
  MapPin,
  Building2
} from 'lucide-react';
import { incidentsService } from '../services/api';
import FormModal from '../components/FormModal';
import IncidentForm from '../components/forms/IncidentForm';

const Incidentes = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tipo: '',
    severidade: '',
    status: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    loadIncidents();
  }, [searchTerm, filters]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters
      };
      const response = await incidentsService.getAll(params);
      setIncidents(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar incidentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedIncident(null);
  };

  const handleEdit = (incident) => {
    setSelectedIncident(incident);
    setShowModal(true);
  };

  const getTipoBadge = (tipo) => {
    const tipos = {
      'quase_acidente': { label: 'Quase Acidente', color: 'bg-yellow-100 text-yellow-800' },
      'acidente_leve': { label: 'Acidente Leve', color: 'bg-orange-100 text-orange-800' },
      'acidente_moderado': { label: 'Acidente Moderado', color: 'bg-red-100 text-red-800' },
      'acidente_grave': { label: 'Acidente Grave', color: 'bg-red-100 text-red-800' },
      'acidente_fatal': { label: 'Acidente Fatal', color: 'bg-red-100 text-red-800' }
    };
    const tipoInfo = tipos[tipo] || { label: tipo, color: 'bg-gray-100 text-gray-800' };
    return <span className={`status-badge ${tipoInfo.color}`}>{tipoInfo.label}</span>;
  };

  const getSeveridadeBadge = (severidade) => {
    const severidades = {
      'baixa': { label: 'Baixa', color: 'bg-green-100 text-green-800' },
      'media': { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
      'alta': { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
      'critica': { label: 'Crítica', color: 'bg-red-100 text-red-800' }
    };
    const severidadeInfo = severidades[severidade] || { label: severidade, color: 'bg-gray-100 text-gray-800' };
    return <span className={`status-badge ${severidadeInfo.color}`}>{severidadeInfo.label}</span>;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      'registrado': { label: 'Registrado', color: 'bg-blue-100 text-blue-800' },
      'investigando': { label: 'Investigando', color: 'bg-yellow-100 text-yellow-800' },
      'analisando': { label: 'Analisando', color: 'bg-orange-100 text-orange-800' },
      'implementando': { label: 'Implementando', color: 'bg-purple-100 text-purple-800' },
      'concluido': { label: 'Concluído', color: 'bg-green-100 text-green-800' }
    };
    const statusInfo = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`status-badge ${statusInfo.color}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este incidente?')) {
      try {
        await incidentsService.delete(id);
        loadIncidents();
      } catch (error) {
        console.error('Erro ao excluir incidente:', error);
      }
    }
  };

  const handleCompleteIncident = async (incident) => {
    if (incident.status === 'concluido') return;
    try {
      await incidentsService.updateStatus(incident.id, 'concluido');
      loadIncidents();
    } catch (error) {
      console.error('Erro ao concluir incidente:', error);
      alert('Não foi possível concluir o incidente.');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Incidentes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registro e gestão de incidentes de segurança
          </p>
        </div>
        <button
          className="btn-primary flex items-center"
          onClick={() => {
            setSelectedIncident(null);
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Incidente
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou descrição..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={filters.tipo}
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
            >
              <option value="">Todos os tipos</option>
              <option value="quase_acidente">Quase Acidente</option>
              <option value="acidente_leve">Acidente Leve</option>
              <option value="acidente_moderado">Acidente Moderado</option>
              <option value="acidente_grave">Acidente Grave</option>
              <option value="acidente_fatal">Acidente Fatal</option>
            </select>
            <select
              className="input-field"
              value={filters.severidade}
              onChange={(e) => setFilters({...filters, severidade: e.target.value})}
            >
              <option value="">Todas as severidades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
            <select
              className="input-field"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos os status</option>
              <option value="registrado">Registrado</option>
              <option value="investigando">Investigando</option>
              <option value="analisando">Analisando</option>
              <option value="implementando">Implementando</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((incident) => (
          <div key={incident.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {incident.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {incident.descricao}
                  </p>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {incident.empresaNome}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {incident.local}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(incident.dataOcorrencia)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                {getTipoBadge(incident.tipo)}
                {getSeveridadeBadge(incident.severidade)}
                {getStatusBadge(incident.status)}
              </div>
            </div>

            {/* Incident Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <User className="h-4 w-4 mr-2" />
                  Responsável
                </div>
                <p className="font-medium text-gray-900">{incident.responsavelRegistro}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Custos
                </div>
                <p className="font-medium text-gray-900">
                  R$ {incident.custos.total.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Tempo Perdido
                </div>
                <p className="font-medium text-gray-900">
                  {incident.tempoPerdido}h
                </p>
              </div>
            </div>

            {/* Attachments */}
            {(incident.fotos.length > 0 || incident.documentos.length > 0) && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-4">
                  {incident.fotos.length > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Camera className="h-4 w-4 mr-1" />
                      {incident.fotos.length} foto(s)
                    </div>
                  )}
                  {incident.documentos.length > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      {incident.documentos.length} documento(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Registrado em: {formatDate(incident.dataRegistro)}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </button>
                <button
                  className="btn-secondary flex items-center"
                  onClick={() => handleEdit(incident)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </button>
                <button
                  className="btn-secondary flex items-center text-green-700 hover:bg-green-50"
                  disabled={incident.status === 'concluido'}
                  onClick={() => handleCompleteIncident(incident)}
                >
                  Concluir
                </button>
                <button 
                  className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(incident.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {incidents.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum incidente encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece registrando um novo incidente.'
            }
          </p>
        </div>
      )}

      <FormModal
        isOpen={showModal}
        onClose={closeModal}
        title={selectedIncident ? 'Editar Incidente' : 'Novo Incidente'}
        showFooter={false}
        asForm={false}
      >
        <IncidentForm
          incident={selectedIncident}
          onSave={() => {
            loadIncidents();
            closeModal();
          }}
          onCancel={closeModal}
        />
      </FormModal>
    </div>
  );
};

export default Incidentes;
