import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Filter,
  Plus,
  Shield,
  User
} from 'lucide-react';
import Select from 'react-select';
import AgendaMonthCalendar from '../components/AgendaMonthCalendar';
import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { checklistsService, empresasService, eventosService, tarefasService } from '../services/api';

const pad = (value) => String(value).padStart(2, '0');

const getLocalDateKey = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const agendaFilterSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '3rem',
    borderRadius: '999px',
    borderColor: state.isFocused ? 'rgba(140, 240, 69, 0.72)' : 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(140, 240, 69, 0.12)' : '0 10px 24px rgba(15, 23, 42, 0.06)',
    paddingInline: '0.35rem',
    transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
    '&:hover': {
      borderColor: 'rgba(140, 240, 69, 0.58)'
    }
  }),
  valueContainer: (base) => ({
    ...base,
    paddingInline: '0.7rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: '#475569'
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
    fontWeight: 600
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#4d7c0f' : '#64748b',
    '&:hover': {
      color: '#4d7c0f'
    }
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 70
  }),
  menu: (base) => ({
    ...base,
    marginTop: '0.5rem',
    borderRadius: '1.2rem',
    overflow: 'hidden',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    boxShadow: '0 24px 50px rgba(15, 23, 42, 0.14)'
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.4rem'
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.9rem',
    padding: '0.7rem 0.85rem',
    backgroundColor: state.isSelected
      ? 'rgba(140, 240, 69, 0.16)'
      : state.isFocused
        ? 'rgba(148, 163, 184, 0.08)'
        : 'transparent',
    color: '#0f172a',
    fontWeight: state.isSelected ? 700 : 500,
    cursor: 'pointer'
  })
};

const tipoFilterOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'tarefas', label: 'Tarefas' },
  { value: 'inspecoes', label: 'Inspecoes' },
  { value: 'eventos', label: 'Eventos' }
];

const statusFilterOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluido' },
  { value: 'cancelada', label: 'Cancelada' }
];

const Agenda = () => {
  const { hasPermission } = useAuth();
  const canWriteEvents = hasPermission('events:write');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [tarefas, setTarefas] = useState([]);
  const [inspecoes, setInspecoes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [filters, setFilters] = useState({
    tipo: 'all',
    status: 'all'
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
    void loadAgendaData();
  }, []);

  const loadAgendaData = async () => {
    try {
      setLoading(true);
      const [tarefasRes, inspecoesRes, eventosRes, empresasRes] = await Promise.all([
        tarefasService.getAll(),
        checklistsService.getInspections(),
        eventosService.getAll(),
        empresasService.getAll()
      ]);

      setTarefas(tarefasRes.data.data || []);
      setInspecoes(inspecoesRes.data.data || []);
      setEventos(eventosRes.data.data || []);
      setEmpresas(empresasRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados da agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmpresaNome = (empresaId) => {
    const empresa = empresas.find((item) => item.id === empresaId);
    return empresa?.nome || '-';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Dia todo';
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatInputDate = (date) => {
    const normalized = new Date(date);
    return `${normalized.getFullYear()}-${pad(normalized.getMonth() + 1)}-${pad(normalized.getDate())}`;
  };

  const formatLongDate = (date) =>
    new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

  const getTimestampFrom = (dateValue, referenceDate, timeValue) => {
    if (dateValue) {
      const hasTime = String(dateValue).includes('T');
      const composed = hasTime ? dateValue : `${dateValue}${timeValue ? `T${timeValue}` : ''}`;
      const parsed = new Date(composed);
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
    }

    if (referenceDate) {
      const ref = new Date(referenceDate);
      if (timeValue) {
        const [h, m] = String(timeValue).split(':');
        ref.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
      }
      return ref.getTime();
    }

    return Number.MAX_SAFE_INTEGER;
  };

  const getEventsForDate = (date) => {
    const dateKey = getLocalDateKey(date);

    let tarefasDoDia = tarefas.filter((tarefa) => {
      if (getLocalDateKey(tarefa.dataVencimento) !== dateKey) return false;
      if (filters.status !== 'all') return String(tarefa.status || '').toLowerCase() === filters.status;
      return true;
    });

    let inspecoesDoDia = inspecoes.filter((inspecao) => getLocalDateKey(inspecao.date) === dateKey);
    let eventosDoDia = eventos.filter((evento) => getLocalDateKey(evento.dataEvento) === dateKey);

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

  const getMonthDatesMap = (anchorDate) => {
    const currentDate = new Date(anchorDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const result = {};

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const eventsForDate = getEventsForDate(date);
      if (eventsForDate.total > 0) {
        result[getLocalDateKey(date)] = eventsForDate;
      }
    }

    return result;
  };

  const getWeekDates = (date) => {
    const base = new Date(date);
    const day = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - day);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(base);
      next.setDate(base.getDate() + index);
      return next;
    });
  };

  const buildDayTimeline = (dayData, referenceDate) => {
    const visuals = {
      tarefa: { label: 'Tarefa', chipClass: 'status-info', dotClass: 'bg-sky-500' },
      inspecao: { label: 'Inspecao', chipClass: 'status-success', dotClass: 'bg-emerald-500' },
      evento: { label: 'Evento', chipClass: 'status-warning', dotClass: 'bg-fuchsia-500' }
    };

    const timeline = [];

    dayData.tarefas.forEach((tarefa) => {
      const visual = visuals.tarefa;
      timeline.push({
        id: `tarefa-${tarefa.id}`,
        typeLabel: visual.label,
        chipClass: visual.chipClass,
        dotClass: visual.dotClass,
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
        chipClass: visual.chipClass,
        dotClass: visual.dotClass,
        title: inspecao.titulo || 'Inspecao de seguranca',
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
        chipClass: visual.chipClass,
        dotClass: visual.dotClass,
        title: evento.titulo,
        description: evento.descricao,
        company: getEmpresaNome(evento.empresaId),
        responsavel: evento.responsavel,
        badge: evento.prioridade ? evento.prioridade.toUpperCase() : null,
        timeLabel: evento.horaEvento || 'Dia todo',
        sortKey: getTimestampFrom(evento.dataEvento, referenceDate, evento.horaEvento),
        rawEvento: evento
      });
    });

    return timeline.sort((a, b) => a.sortKey - b.sortKey);
  };

  const visibleMonthAnchor = activeStartDate || selectedDate;
  const monthLabel = visibleMonthAnchor.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const visibleMonthEvents = useMemo(() => getMonthDatesMap(visibleMonthAnchor), [visibleMonthAnchor, tarefas, inspecoes, eventos, filters]);
  const selectedDateEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate, tarefas, inspecoes, eventos, filters]);
  const dayTimeline = useMemo(() => buildDayTimeline(selectedDateEvents, selectedDate), [selectedDateEvents, selectedDate, empresas]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const visibleMonthSummary = useMemo(() => {
    const year = visibleMonthAnchor.getFullYear();
    const month = visibleMonthAnchor.getMonth();

    const isSameMonth = (value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month;
    };

    const tarefasMes = tarefas.filter((item) => isSameMonth(item.dataVencimento));
    const inspecoesMes = inspecoes.filter((item) => isSameMonth(item.date));
    const eventosMes = eventos.filter((item) => isSameMonth(item.dataEvento));

    return {
      tarefas: tarefasMes.length,
      pendentes: tarefasMes.filter((item) => item.status === 'pendente').length,
      inspecoes: inspecoesMes.length,
      eventos: eventosMes.length,
      diasComMovimento: Object.keys(visibleMonthEvents).length
    };
  }, [eventos, inspecoes, tarefas, visibleMonthAnchor, visibleMonthEvents]);

  const selectedTipoOption = tipoFilterOptions.find((option) => option.value === filters.tipo) || tipoFilterOptions[0];
  const selectedStatusOption = statusFilterOptions.find((option) => option.value === filters.status) || statusFilterOptions[0];

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

  const handleEventChange = (event) => {
    const { name, value } = event.target;
    setEventForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    if (!canWriteEvents) return;

    setEventLoading(true);
    setEventError(null);

    try {
      await eventosService.create({
        titulo: eventForm.titulo,
        descricao: eventForm.descricao,
        empresaId: eventForm.empresaId || undefined,
        responsavel: eventForm.responsavel,
        prioridade: eventForm.prioridade,
        dataEvento: eventForm.dataEvento,
        horaEvento: eventForm.horaEvento
      });

      await loadAgendaData();
      closeEventModal();
    } catch (error) {
      setEventError(error.response?.data?.error || 'Erro ao criar evento');
    } finally {
      setEventLoading(false);
    }
  };

  const handleCompleteEvento = async (evento) => {
    if (!canWriteEvents || !evento?.id || evento.status === 'concluido') return;

    try {
      await eventosService.update(evento.id, {
        ...evento,
        status: 'concluido'
      });
      await loadAgendaData();
    } catch (error) {
      console.error('Erro ao concluir evento:', error);
      window.alert('Nao foi possivel concluir o evento.');
    }
  };

  const setTodayContext = () => {
    const today = new Date();
    setSelectedDate(today);
    setActiveStartDate(today);
  };

  const renderTimeline = () => {
    if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-lime-500" />
        </div>
      );
    }

    if (dayTimeline.length === 0) {
      return (
        <EmptyState
          icon={CalendarIcon}
          title="Dia sem movimentacao"
          description="Nao ha tarefas, inspecoes ou eventos registrados para a data selecionada."
        />
      );
    }

    return (
      <div className="relative pl-6">
        <div className="absolute bottom-0 left-2 top-0 w-px bg-slate-200" />
        <div className="space-y-4">
          {dayTimeline.map((item) => (
            <div key={item.id} className="relative">
              <div className={`absolute -left-[22px] top-5 h-3.5 w-3.5 rounded-full border-4 border-white ${item.dotClass}`} />
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.timeLabel}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{item.title}</p>
                  </div>
                  <span className={`status-badge ${item.chipClass}`}>{item.typeLabel}</span>
                </div>
                {item.description ? <p className="mt-2 text-sm text-slate-500">{item.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  {item.company ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {item.company}
                    </span>
                  ) : null}
                  {item.responsavel ? (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {item.responsavel}
                    </span>
                  ) : null}
                  {item.badge ? <span className="status-badge status-warning">{item.badge}</span> : null}
                </div>
                {item.rawEvento ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={item.rawEvento.status === 'concluido' || !canWriteEvents}
                      onClick={() => handleCompleteEvento(item.rawEvento)}
                    >
                      Marcar como concluido
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="grid gap-4 xl:grid-cols-7">
      {weekDates.map((date) => {
        const eventsForDay = getEventsForDate(date);
        const isSelected = getLocalDateKey(date) === getLocalDateKey(selectedDate);

        return (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => setSelectedDate(date)}
            className={`rounded-[1.4rem] border p-4 text-left transition-all duration-200 ${
              isSelected
                ? 'border-lime-300 bg-lime-50/80 shadow-[0_16px_36px_rgba(140,240,69,0.16)]'
                : 'border-slate-200/80 bg-white/86 hover:-translate-y-1'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{date.getDate()}</p>
              </div>
              <span className="status-badge status-info">{eventsForDay.total}</span>
            </div>
            <div className="mt-4 space-y-2">
              {eventsForDay.tarefas.slice(0, 2).map((tarefa) => (
                <div key={tarefa.id} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                  {tarefa.titulo}
                </div>
              ))}
              {eventsForDay.inspecoes.slice(0, 2).map((inspecao, index) => (
                <div key={inspecao.id || index} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {inspecao.titulo || 'Inspecao'}
                </div>
              ))}
              {eventsForDay.eventos.slice(0, 2).map((evento) => (
                <div key={evento.id || evento.titulo} className="rounded-xl bg-fuchsia-50 px-3 py-2 text-xs font-medium text-fuchsia-700">
                  {evento.titulo}
                </div>
              ))}
              {eventsForDay.total === 0 ? <div className="text-xs text-slate-400">Sem itens</div> : null}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda operacional"
        title="Calendario de execucao com leitura tecnica."
        description="Concentre tarefas, inspecoes e eventos em uma agenda que prioriza ritmo operacional, vencimentos e contexto por empresa."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={setTodayContext}>
              Hoje
            </button>
            <button
              type="button"
              className={`btn-primary ${canWriteEvents ? '' : 'opacity-60 cursor-not-allowed'}`}
              onClick={openEventModal}
              disabled={!canWriteEvents}
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </button>
          </>
        }
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto_auto]">
          <div className="segmented-tabs">
            {[
              { id: 'month', label: 'Mes' },
              { id: 'week', label: 'Semana' },
              { id: 'day', label: 'Dia' }
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setView(item.id)} className={view === item.id ? 'is-active' : ''}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <Filter className="h-4 w-4 text-lime-300" />
            <span className="font-semibold capitalize">{monthLabel}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              inputId="agenda-filter-tipo"
              className="min-w-0"
              classNamePrefix="agenda-filter-select"
              isSearchable={false}
              options={tipoFilterOptions}
              value={selectedTipoOption}
              onChange={(option) =>
                setFilters((prev) => ({
                  ...prev,
                  tipo: option?.value || 'all'
                }))
              }
              styles={agendaFilterSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
            <Select
              inputId="agenda-filter-status"
              className="min-w-0"
              classNamePrefix="agenda-filter-select"
              isSearchable={false}
              options={statusFilterOptions}
              value={selectedStatusOption}
              onChange={(option) =>
                setFilters((prev) => ({
                  ...prev,
                  status: option?.value || 'all'
                }))
              }
              styles={agendaFilterSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
        </div>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CheckSquare} label="Tarefas no mes" value={visibleMonthSummary.tarefas} meta={`${visibleMonthSummary.pendentes} pendentes`} tone="blue" />
        <MetricCard icon={Shield} label="Inspecoes no mes" value={visibleMonthSummary.inspecoes} meta="Ritmo de verificacao" tone="lime" />
        <MetricCard icon={CalendarIcon} label="Eventos no mes" value={visibleMonthSummary.eventos} meta="Compromissos customizados" tone="amber" />
        <MetricCard icon={Clock} label="Dias ativos" value={visibleMonthSummary.diasComMovimento} meta="Datas com movimentacao" tone="slate" />
      </section>

      <FormModal
        isOpen={showEventModal}
        onClose={closeEventModal}
        title="Novo evento"
        onSubmit={handleEventSubmit}
        submitText="Criar evento"
        loading={eventLoading}
        error={eventError}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Titulo *</label>
            <input type="text" name="titulo" value={eventForm.titulo} onChange={handleEventChange} required className="input-field" placeholder="Informe o titulo do evento" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Empresa *</label>
            <select name="empresaId" value={eventForm.empresaId} onChange={handleEventChange} required className="input-field">
              <option value="">Selecione a empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Responsavel</label>
            <input type="text" name="responsavel" value={eventForm.responsavel} onChange={handleEventChange} className="input-field" placeholder="Responsavel pela atividade" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Data do evento *</label>
            <input type="date" name="dataEvento" value={eventForm.dataEvento} onChange={handleEventChange} required className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Horario</label>
            <input type="time" name="horaEvento" value={eventForm.horaEvento} onChange={handleEventChange} className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prioridade</label>
            <select name="prioridade" value={eventForm.prioridade} onChange={handleEventChange} className="input-field">
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Descricao</label>
            <textarea name="descricao" value={eventForm.descricao} onChange={handleEventChange} rows={4} className="input-field" placeholder="Contexto, objetivo ou orientacao do evento" />
          </div>
        </div>
      </FormModal>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.85fr]">
        {view === 'month' ? (
          <AgendaMonthCalendar
            activeStartDate={visibleMonthAnchor}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onActiveStartDateChange={setActiveStartDate}
            getDayEvents={getEventsForDate}
            loading={loading}
          />
        ) : (
          <div className="panel-surface p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Navegacao</p>
                <h2 className="mt-1 text-xl text-slate-900">
                  {view === 'week' ? 'Panorama semanal' : 'Linha do tempo do dia'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="agenda-legend-dot bg-sky-500" />
                  Tarefas
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="agenda-legend-dot bg-emerald-500" />
                  Inspecoes
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="agenda-legend-dot bg-fuchsia-500" />
                  Eventos
                </span>
              </div>
            </div>

            {view === 'week' ? renderWeekView() : null}

            {view === 'day' ? (
              <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Linha do tempo</p>
                    <p className="mt-1 text-2xl font-semibold capitalize text-slate-900">{formatLongDate(selectedDate)}</p>
                  </div>
                  <span className="status-badge status-info">
                    {dayTimeline.length === 1 ? '1 atividade' : `${dayTimeline.length} atividades`}
                  </span>
                </div>
                {renderTimeline()}
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-6">
          <div className="panel-surface p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Data selecionada</p>
                <h2 className="mt-1 text-xl font-semibold capitalize text-slate-900">{formatLongDate(selectedDate)}</h2>
              </div>
              <span className="status-badge status-info">{selectedDateEvents.total}</span>
            </div>

            {view === 'day' ? (
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Leitura do dia</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Use a timeline principal para executar. Este painel resume volume, foco e composicao da data.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-sky-50 px-4 py-3">
                  <span className="text-sm text-sky-700">Tarefas</span>
                  <strong className="text-sky-900">{selectedDateEvents.tarefas.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-emerald-700">Inspecoes</span>
                  <strong className="text-emerald-900">{selectedDateEvents.inspecoes.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-fuchsia-50 px-4 py-3">
                  <span className="text-sm text-fuchsia-700">Eventos</span>
                  <strong className="text-fuchsia-900">{selectedDateEvents.eventos.length}</strong>
                </div>
              </div>
            ) : selectedDateEvents.total === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="Sem itens nesta data"
                description="Selecione outro dia ou amplie o tipo exibido para encontrar movimentacao."
              />
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.tarefas.map((tarefa) => (
                  <div key={tarefa.id} className="rounded-[1.2rem] border border-sky-100 bg-sky-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <CheckSquare className="mt-0.5 h-5 w-5 text-sky-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{tarefa.titulo}</p>
                        <p className="mt-1 text-sm text-slate-500">{tarefa.empresaNome || getEmpresaNome(tarefa.empresaId)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="status-badge status-info">{tarefa.prioridade?.toUpperCase() || 'NORMAL'}</span>
                          <span className="status-badge status-warning">{formatTime(tarefa.dataVencimento)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedDateEvents.inspecoes.map((inspecao, index) => (
                  <div key={inspecao.id || index} className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{inspecao.titulo || 'Inspecao de seguranca'}</p>
                        <p className="mt-1 text-sm text-slate-500">{inspecao.empresaNome || '-'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="status-badge status-success">{inspecao.inspectorName || 'Sem inspetor'}</span>
                          <span className="status-badge status-warning">{inspecao.date ? formatTime(inspecao.date) : 'Dia todo'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedDateEvents.eventos.map((evento) => (
                  <div key={evento.id || `evento-${evento.titulo}`} className="rounded-[1.2rem] border border-fuchsia-100 bg-fuchsia-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="mt-0.5 h-5 w-5 text-fuchsia-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{evento.titulo}</p>
                        <p className="mt-1 text-sm text-slate-500">{getEmpresaNome(evento.empresaId)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {evento.responsavel ? <span className="status-badge status-info">{evento.responsavel}</span> : null}
                          <span className="status-badge status-warning">{evento.prioridade?.toUpperCase() || 'MEDIA'}</span>
                          <span className="status-badge status-warning">{evento.horaEvento || 'Dia todo'}</span>
                        </div>
                        {canWriteEvents ? (
                          <div className="mt-4">
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={evento.status === 'concluido'}
                              onClick={() => handleCompleteEvento(evento)}
                            >
                              Marcar como concluido
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-surface p-6">
            <div className="mb-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Resumo do periodo</p>
              <h2 className="mt-1 text-xl font-semibold capitalize text-slate-900">{monthLabel}</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckSquare className="h-4 w-4 text-sky-600" />
                  Tarefas
                </div>
                <strong className="text-slate-900">{visibleMonthSummary.tarefas}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Inspecoes
                </div>
                <strong className="text-slate-900">{visibleMonthSummary.inspecoes}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarIcon className="h-4 w-4 text-fuchsia-600" />
                  Eventos
                </div>
                <strong className="text-slate-900">{visibleMonthSummary.eventos}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Clock className="h-4 w-4 text-lime-300" />
                  Pendencias
                </div>
                <strong>{visibleMonthSummary.pendentes}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Agenda;
