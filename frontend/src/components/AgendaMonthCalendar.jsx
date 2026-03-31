import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const setMidday = (date) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
};

const getMonthStart = (date) => setMidday(new Date(date.getFullYear(), date.getMonth(), 1));

const getGridStart = (date) => {
  const start = getMonthStart(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return setMidday(start);
};

const isSameDay = (left, right) =>
  left?.getFullYear() === right?.getFullYear() &&
  left?.getMonth() === right?.getMonth() &&
  left?.getDate() === right?.getDate();

const isSameMonth = (left, right) =>
  left?.getFullYear() === right?.getFullYear() && left?.getMonth() === right?.getMonth();

const capitalizeLabel = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

const buildMonthCells = (activeStartDate) => {
  const start = getGridStart(activeStartDate);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return setMidday(date);
  });
};

const AgendaMonthCalendar = ({
  activeStartDate,
  selectedDate,
  onSelectDate,
  onActiveStartDateChange,
  getDayEvents,
  loading
}) => {
  const today = setMidday(new Date());
  const monthTitle = `Agenda - ${capitalizeLabel(
    activeStartDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    })
  )}`;

  const currentMonthPill = capitalizeLabel(
    activeStartDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    })
  );

  const monthCells = buildMonthCells(activeStartDate);

  const handleMonthShift = (offset) => {
    const nextMonth = setMidday(new Date(activeStartDate.getFullYear(), activeStartDate.getMonth() + offset, 1));
    onActiveStartDateChange(nextMonth);
  };

  const handleDaySelect = (date) => {
    onSelectDate(date);
    if (!isSameMonth(date, activeStartDate)) {
      onActiveStartDateChange(getMonthStart(date));
    }
  };

  const renderMarkers = (dayEvents) => {
    const hasTasks = dayEvents?.tarefas?.length > 0;
    const hasInspections = dayEvents?.inspecoes?.length > 0;
    const hasEvents = dayEvents?.eventos?.length > 0;

    return (
      <div className="agenda-month-calendar__markers">
        {hasTasks ? <span className="agenda-month-calendar__marker agenda-month-calendar__marker--task" /> : null}
        {hasInspections ? <span className="agenda-month-calendar__marker agenda-month-calendar__marker--inspection" /> : null}
        {hasEvents ? <span className="agenda-month-calendar__marker agenda-month-calendar__marker--event" /> : null}
      </div>
    );
  };

  return (
    <div className="agenda-month-calendar">
      <div
        className={`agenda-month-calendar__surface ${loading ? 'agenda-month-calendar__surface--loading' : ''}`}
        aria-busy={loading}
      >
        <div className="agenda-month-calendar__header">
          <div className="agenda-month-calendar__title-wrap">
            <p className="agenda-month-calendar__eyebrow">Calendario mensal</p>
            <h2 className="agenda-month-calendar__title">{monthTitle}</h2>
          </div>

          <div className="agenda-month-calendar__nav">
            <button
              type="button"
              className="agenda-month-calendar__nav-button"
              onClick={() => handleMonthShift(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="agenda-month-calendar__month-pill">{currentMonthPill}</div>

            <button
              type="button"
              className="agenda-month-calendar__nav-button"
              onClick={() => handleMonthShift(1)}
              aria-label="Proximo mes"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="agenda-month-calendar__weekday-row" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="agenda-month-calendar__weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="agenda-month-calendar__grid">
          {monthCells.map((date) => {
            const dayEvents = getDayEvents(date);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const selected = isSameDay(date, selectedDate);
            const todayState = isSameDay(date, today);
            const neighboringMonth = !isSameMonth(date, activeStartDate);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDaySelect(date)}
                className={[
                  'agenda-month-calendar__day',
                  selected ? 'agenda-month-calendar__day--selected' : '',
                  todayState ? 'agenda-month-calendar__day--today' : '',
                  neighboringMonth ? 'agenda-month-calendar__day--muted' : '',
                  !neighboringMonth && dayEvents ? 'agenda-month-calendar__day--active' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="agenda-month-calendar__day-top">
                  <span className="agenda-month-calendar__day-number">{date.getDate()}</span>
                </div>
                <div className="agenda-month-calendar__day-bottom">{renderMarkers(dayEvents)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgendaMonthCalendar;
