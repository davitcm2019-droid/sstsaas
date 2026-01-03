import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckSquare, 
  AlertTriangle,
  Building2,
  User,
  Plus,
  Filter
} from 'lucide-react';
import { tarefasService, checklistsService, empresasService, eventosService } from '../services/api';
import FormModal from '../components/FormModal';
import 'react-calendar/dist/Calendar.css';

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tarefas, setTarefas] = useState([]);
  const [inspecoes, setInspecoes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month'); // month, week, day
  const [filters, setFilters] = useState({
    tipo: 'all', // all, tarefas, inspecoes, eventos
    status: 'all' // all, pendente, em_andamento, concluido, cancelada
  });
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    titulo: '',
    descricao: '',
    empresaId: '',
    responsavel: '',
    dataEvento: '',
    horaEvento: '',
    prioridade: 'media'
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedDate, filters]);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [tarefasRes, inspecoesRes, eventosRes] = await Promise.all([
        tarefasService.getAll(),
        checklistsService.getInspections(),
        eventosService.getAll()
      ]);

      setTarefas(tarefasRes.data.data);
      setInspecoes(inspecoesRes.data.data);
      setEventos(eventosRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const response = await empresasService.getAll();
      setEmpresas(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const normalizeDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const getEmpresaNome = (empresaId) => {
    const empresa = empresas.find(item => item.id === empresaId);
    return empresa?.nome || '-';
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Tarefas do dia com filtros de status
    let tarefasDoDia = tarefas.filter(tarefa => {
      const vencimento = normalizeDateKey(tarefa.dataVencimento);
      if (vencimento !== dateStr) return false;
      if (filters.status !== 'all') return (tarefa.status || '').toLowerCase() === filters.status;
      return true;
    });

    // Inspe��es do dia (sem status conhecido no mock)
    let inspecoesDoDia = inspecoes.filter(inspecao => {
      const dataInspecao = normalizeDateKey(inspecao.date);
      return dataInspecao === dateStr;
    });

    // Eventos do dia
    let eventosDoDia = eventos.filter(evento => {
      const dataEvento = normalizeDateKey(evento.dataEvento);
      return dataEvento === dateStr;
    });

    // Filtro por tipo
    if (filters.tipo === 'tarefas') {
      inspecoesDoDia = [];
      eventosDoDia = [];
    } else if (filters.tipo === 'inspecoes') {
      tarefasDoDia = [];
      eventosDoDia = [];
    } else if (filters.tipo === 'eventos') {
      tarefasDoDia = [];
      inspecoesDoDia = [];
    }

    return {
      tarefas: tarefasDoDia,
      inspecoes: inspecoesDoDia,
      eventos: eventosDoDia,
      total: tarefasDoDia.length + inspecoesDoDia.length + eventosDoDia.length
    };
  };

  const getEventsForMonth = () => {
    const events = {};
    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Iterar por todos os dias do mês
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getMonth() === month) {
        const eventsForDate = getEventsForDate(date);
        if (eventsForDate.total > 0) {
          events[day] = eventsForDate;
        }
      }
    }

    return events;
  };

  const getEventTypeColor = (tipo) => {
    switch (tipo) {
      case 'tarefa':
        return 'bg-blue-500';
      case 'inspecao':
        return 'bg-green-500';
      case 'evento':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (prioridade) => {
    switch (prioridade) {
      case 'alta':
        return 'text-red-600';
      case 'media':
        return 'text-yellow-600';
      case 'baixa':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEventModal = () => {
    setEventError(null);
    setEventForm({
      titulo: '',
      descricao: '',
      empresaId: '',
      responsavel: '',
      dataEvento: formatInputDate(selectedDate),
      horaEvento: '',
      prioridade: 'media'
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEventError(null);
    setEventLoading(false);
    setEventForm({
      titulo: '',
      descricao: '',
      empresaId: '',
      responsavel: '',
      dataEvento: '',
      horaEvento: '',
      prioridade: 'media'
    });
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventLoading(true);
    setEventError(null);

    try {
      await eventosService.create({
        titulo: eventForm.titulo,
        descricao: eventForm.descricao,
        empresaId: eventForm.empresaId ? parseInt(eventForm.empresaId) : undefined,
        responsavel: eventForm.responsavel,
        prioridade: eventForm.prioridade,
        dataEvento: eventForm.dataEvento,
        horaEvento: eventForm.horaEvento
      });

      await loadData();
      closeEventModal();
    } catch (error) {
      setEventError(error.response?.data?.error || 'Erro ao criar evento');
    } finally {
      setEventLoading(false);
    }
  };

  const getWeekDates = (date) => {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(d);
      nd.setDate(d.getDate() + i);
      return nd;
    });
  };

  const getTimestampFrom = (dateValue, referenceDate, timeValue) => {
    if (dateValue) {
      const hasTime = dateValue.includes('T');
      const composed = hasTime
        ? dateValue
        : `${dateValue}${timeValue ? `T${timeValue}` : ''}`;
      const parsed = new Date(composed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    if (referenceDate) {
      const ref = new Date(referenceDate);
      if (timeValue) {
        const [h, m] = timeValue.split(':');
        ref.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
      }
      return ref.getTime();
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const buildDayTimeline = (dayData, referenceDate) => {
    const visuals = {
      tarefa: {
        label: 'Tarefa',
        chip: 'bg-blue-100 text-blue-700',
        dot: 'bg-blue-500'
      },
      inspecao: {
        label: 'Inspeção',
        chip: 'bg-green-100 text-green-700',
        dot: 'bg-green-500'
      },
      evento: {
        label: 'Evento',
        chip: 'bg-purple-100 text-purple-700',
        dot: 'bg-purple-500'
      }
    };

    const timeline = [];

    dayData.tarefas.forEach((tarefa) => {
      const visual = visuals.tarefa;
      timeline.push({
        id: `tarefa-${tarefa.id}`,
        typeLabel: visual.label,
        chipColor: visual.chip,
        dotColor: visual.dot,
        title: tarefa.titulo,
        description: tarefa.descricao,
        company: tarefa.empresaNome || getEmpresaNome(tarefa.empresaId),
        responsavel: tarefa.responsavel,
        badge: tarefa.prioridade ? tarefa.prioridade.toUpperCase() : null,
        timeLabel: tarefa.dataVencimento ? formatTime(tarefa.dataVencimento) : 'Dia todo',
        sortKey: getTimestampFrom(tarefa.dataVencimento, referenceDate)
      });
    });

    dayData.inspecoes.forEach((inspecao, index) => {
      const visual = visuals.inspecao;
      timeline.push({
        id: `inspecao-${inspecao.id || index}`,
        typeLabel: visual.label,
        chipColor: visual.chip,
        dotColor: visual.dot,
        title: inspecao.titulo || 'Inspeção de Segurança',
        description: inspecao.observacoes,
        company: inspecao.empresaNome,
        responsavel: inspecao.inspectorName,
        timeLabel: inspecao.date ? formatTime(inspecao.date) : 'Dia todo',
        sortKey: getTimestampFrom(inspecao.date, referenceDate)
      });
    });

    dayData.eventos.forEach((evento, index) => {
      const visual = visuals.evento;
      timeline.push({
        id: `evento-${evento.id || index}`,
        typeLabel: visual.label,
        chipColor: visual.chip,
        dotColor: visual.dot,
        title: evento.titulo,
        description: evento.descricao,
        company: getEmpresaNome(evento.empresaId),
        responsavel: evento.responsavel,
        badge: evento.prioridade ? evento.prioridade.toUpperCase() : null,
        timeLabel: evento.horaEvento || 'Dia todo',
        sortKey: getTimestampFrom(evento.dataEvento, referenceDate, evento.horaEvento)
      });
    });

    return timeline.sort((a, b) => a.sortKey - b.sortKey);
  };
  const monthEvents = getEventsForMonth();
  const selectedDateEvents = getEventsForDate(selectedDate);
  const dayTimeline = buildDayTimeline(selectedDateEvents, selectedDate);

  const handleCompleteEvento = async (evento) => {
    if (!evento?.id || evento.status === 'concluido') return;
    try {
      await eventosService.update(evento.id, {
        ...evento,
        status: 'concluido'
      });
      await loadData();
    } catch (error) {
      console.error('Erro ao concluir evento:', error);
      alert('Não foi possível concluir o evento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visualize tarefas, inspeções e eventos por data
          </p>
      </div>
      <div className="flex space-x-2">
        <button className="btn-secondary flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </button>
        <button className="btn-primary flex items-center" onClick={openEventModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </button>
      </div>
    </div>

    <FormModal
      isOpen={showEventModal}
      onClose={closeEventModal}
      title="Novo Evento"
      onSubmit={handleEventSubmit}
      submitText="Criar evento"
      loading={eventLoading}
      error={eventError}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titulo *
          </label>
          <input
            type="text"
            name="titulo"
            value={eventForm.titulo}
            onChange={handleEventChange}
            required
            className="input-field"
            placeholder="Informe o titulo do evento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa *
          </label>
          <select
            name="empresaId"
            value={eventForm.empresaId}
            onChange={handleEventChange}
            required
            className="input-field"
          >
            <option value="">Selecione a empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsavel
          </label>
          <input
            type="text"
            name="responsavel"
            value={eventForm.responsavel}
            onChange={handleEventChange}
            className="input-field"
            placeholder="Quem fara a atividade?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data do evento *
          </label>
          <input
            type="date"
            name="dataEvento"
            value={eventForm.dataEvento}
            onChange={handleEventChange}
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Horario (opcional)
          </label>
          <input
            type="time"
            name="horaEvento"
            value={eventForm.horaEvento}
            onChange={handleEventChange}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridade
          </label>
          <select
            name="prioridade"
            value={eventForm.prioridade}
            onChange={handleEventChange}
            className="input-field"
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descricao
          </label>
          <textarea
            name="descricao"
            value={eventForm.descricao}
            onChange={handleEventChange}
            rows={3}
            className="input-field"
            placeholder="Detalhes adicionais do evento"
          />
        </div>
      </div>
    </FormModal>

    {/* View Toggle */}
    <div className="flex space-x-2">
        <button
          onClick={() => setView('month')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'month' 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Mês
        </button>
        <button
          onClick={() => setView('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'week' 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Semana
        </button>
        <button
          onClick={() => setView('day')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'day' 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Dia
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Tipo</label>
            <select
              className="input-field"
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value="tarefas">Tarefas</option>
              <option value="inspecoes">Inspeções</option>
              <option value="eventos">Eventos</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Status</label>
            <select
              className="input-field"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>      {/* Week View */}
      {view === 'week' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {getWeekDates(selectedDate).map((d) => {
              const ev = getEventsForDate(d);
              return (
                <div key={d.toISOString()} className="rounded-lg border border-gray-200 p-2 bg-white">
                  <div className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
                    <span>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                    <span className="text-gray-900">{d.getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    {ev.tarefas.slice(0,3).map((t,idx) => (
                      <div key={`t-${idx}`} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 truncate">
                        {t.titulo}
                      </div>
                    ))}
                    {ev.inspecoes.slice(0,3).map((i,idx) => (
                      <div key={`ins-${idx}`} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 truncate">
                        Inspeções3
                      </div>
                    ))}
                    {ev.eventos.slice(0,3).map((e,idx) => (
                      <div key={`ev-${idx}`} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 truncate">
                        {e.titulo}
                      </div>
                    ))}
                    {(ev.total === 0) && (
                      <div className="text-xs text-gray-400">Sem itens</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view === 'day' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Linha do tempo do dia</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDate(selectedDate)}</p>
            </div>
            <span className="text-sm text-gray-500">
              {dayTimeline.length === 1 ? '1 atividade' : `${dayTimeline.length} atividades`}
            </span>
          </div>
          {dayTimeline.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Nenhuma atividade programada para este dia.
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200"></div>
              {dayTimeline.map((item, index) => (
                <div key={item.id} className={`relative pb-6 ${index === dayTimeline.length - 1 ? 'pb-0' : ''}`}>
                  <div className={`absolute -left-[7px] top-3 w-3 h-3 rounded-full ${item.dotColor} border-2 border-white shadow`}></div>
                  <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">{item.timeLabel}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${item.chipColor}`}>
                        {item.typeLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {item.company && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.company}
                        </span>
                      )}
                      {item.responsavel && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {item.responsavel}
                        </span>
                      )}
                      {item.badge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              className="w-full"
              tileContent={({ date, view }) => {
                if (view === 'month') {
                  const day = date.getDate();
                  const events = monthEvents[day];
                  
                  if (events) {
                    return (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {events.tarefas.slice(0, 2).map((tarefa, index) => (
                          <div
                            key={`tarefa-${index}`}
                            className="w-2 h-2 bg-blue-500 rounded-full"
                            title={tarefa.titulo}
                          />
                        ))}
                        {events.inspecoes.slice(0, 2).map((inspecao, index) => (
                          <div
                            key={`inspecao-${index}`}
                            className="w-2 h-2 bg-green-500 rounded-full"
                            title="Inspeção"
                          />
                        ))}
                        {events.eventos.slice(0, 2).map((evento, index) => (
                          <div
                            key={`evento-${index}`}
                            className="w-2 h-2 bg-purple-500 rounded-full"
                            title={evento.titulo}
                          />
                        ))}
                        {events.total > 4 && (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>
                    );
                  }
                }
                return null;
              }}
            />
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {formatDate(selectedDate)}
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : selectedDateEvents.total === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum evento
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Não há eventos para esta data.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tarefas */}
                {selectedDateEvents.tarefas.map((tarefa) => (
                  <div key={tarefa.id} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {tarefa.titulo}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {tarefa.empresaNome || getEmpresaNome(tarefa.empresaId)}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`text-xs font-medium ${getPriorityColor(tarefa.prioridade)}`}>
                          {tarefa.prioridade.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(tarefa.dataVencimento)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inspeções */}
                {selectedDateEvents.inspecoes.map((inspecao) => (
                  <div key={inspecao.id} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        Inspeção de Segurança
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {inspecao.empresaNome}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs text-gray-500">
                          {inspecao.inspectorName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(inspecao.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Eventos */}
                {selectedDateEvents.eventos.map((evento) => (
                  <div key={evento.id || `evento-${evento.titulo}`} className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {evento.titulo}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {getEmpresaNome(evento.empresaId)}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        {evento.responsavel && (
                          <span className="text-xs text-gray-500">
                            {evento.responsavel}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${getPriorityColor(evento.prioridade)}`}>
                          {evento.prioridade?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {evento.horaEvento || 'Dia todo'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <button
                          className="btn-secondary text-green-700 hover:bg-green-50"
                          disabled={evento.status === 'concluido'}
                          onClick={() => handleCompleteEvento(evento)}
                        >
                          Marcar como concluído
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resumo do Mês
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckSquare className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">Tarefas</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {tarefas.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Inspeções</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {inspecoes.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="text-sm text-gray-600">Eventos</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {eventos.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-gray-600">Pendentes</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {tarefas.filter(t => t.status === 'pendente').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;











