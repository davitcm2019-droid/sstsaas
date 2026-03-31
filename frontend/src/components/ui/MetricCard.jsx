const toneClasses = {
  lime: 'metric-card__icon--lime',
  blue: 'metric-card__icon--blue',
  amber: 'metric-card__icon--amber',
  rose: 'metric-card__icon--rose',
  slate: 'metric-card__icon--slate'
};

const MetricCard = ({ icon: Icon, label, value, meta, tone = 'slate' }) => {
  return (
    <div className="metric-card">
      <div className={`metric-card__icon ${toneClasses[tone] || toneClasses.slate}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="metric-card__content">
        <p className="metric-card__label">{label}</p>
        <strong className="metric-card__value">{value}</strong>
        {meta ? <span className="metric-card__meta">{meta}</span> : null}
      </div>
    </div>
  );
};

export default MetricCard;
