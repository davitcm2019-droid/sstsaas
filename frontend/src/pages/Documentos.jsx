import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Upload,
  File,
  Award,
  Book,
  Clipboard,
  Calendar,
  User,
  Building2,
  Tag
} from 'lucide-react';
import { documentsService } from '../services/api';

const Documentos = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tipo: '',
    categoria: '',
    empresaId: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [searchTerm, filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        ...filters
      };
      const response = await documentsService.getAll(params);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (tipo) => {
    const icons = {
      'relatorio': FileText,
      'certificado': Award,
      'documento': File,
      'manual': Book,
      'formulario': Clipboard
    };
    const Icon = icons[tipo] || File;
    return <Icon className="h-5 w-5" />;
  };

  const getTypeColor = (tipo) => {
    const colors = {
      'relatorio': 'text-blue-600 bg-blue-100',
      'certificado': 'text-green-600 bg-green-100',
      'documento': 'text-gray-600 bg-gray-100',
      'manual': 'text-purple-600 bg-purple-100',
      'formulario': 'text-yellow-600 bg-yellow-100'
    };
    return colors[tipo] || 'text-gray-600 bg-gray-100';
  };

  const getCategoryColor = (categoria) => {
    const colors = {
      'conformidade': 'bg-blue-100 text-blue-800',
      'epi': 'bg-green-100 text-green-800',
      'emergencia': 'bg-red-100 text-red-800',
      'inspecao': 'bg-yellow-100 text-yellow-800',
      'treinamento': 'bg-purple-100 text-purple-800'
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleDownload = async (documentId) => {
    try {
      await documentsService.download(documentId);
      // Simular download
      alert('Download iniciado! (Simulado)');
    } catch (error) {
      console.error('Erro ao fazer download:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await documentsService.delete(id);
        loadDocuments();
      } catch (error) {
        console.error('Erro ao excluir documento:', error);
      }
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
          <h1 className="text-2xl font-bold text-gray-900">Documentos e Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie documentos, certificados e relatórios
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Upload Documento
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
                placeholder="Buscar por nome, descrição ou tags..."
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
              <option value="relatorio">Relatório</option>
              <option value="certificado">Certificado</option>
              <option value="documento">Documento</option>
              <option value="manual">Manual</option>
              <option value="formulario">Formulário</option>
            </select>
            <select
              className="input-field"
              value={filters.categoria}
              onChange={(e) => setFilters({...filters, categoria: e.target.value})}
            >
              <option value="">Todas as categorias</option>
              <option value="conformidade">Conformidade</option>
              <option value="epi">EPI</option>
              <option value="emergencia">Emergência</option>
              <option value="inspecao">Inspeção</option>
              <option value="treinamento">Treinamento</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <div key={document.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${getTypeColor(document.tipo)}`}>
                  {getTypeIcon(document.tipo)}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                    {document.nome}
                  </h3>
                  <p className="text-sm text-gray-500">{document.formato.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <span className={`status-badge ${getTypeColor(document.tipo)}`}>
                  {document.tipo}
                </span>
                <span className={`status-badge ${getCategoryColor(document.categoria)}`}>
                  {document.categoria}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 line-clamp-2">
                {document.descricao}
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Building2 className="h-4 w-4 mr-1" />
                {document.empresaNome}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <User className="h-4 w-4 mr-1" />
                {document.uploadPor}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(document.dataUpload)}
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <span>{formatFileSize(document.tamanho)}</span>
                <span>{document.downloads} downloads</span>
                <span>{document.acessos} acessos</span>
              </div>
              <span>v{document.versao}</span>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button 
                className="flex-1 btn-primary flex items-center justify-center"
                onClick={() => handleDownload(document.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
              <button className="btn-secondary p-2">
                <Eye className="h-4 w-4" />
              </button>
              <button className="btn-secondary p-2">
                <Edit className="h-4 w-4" />
              </button>
              <button 
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(document.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum documento encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece fazendo upload de um documento.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Documentos;
