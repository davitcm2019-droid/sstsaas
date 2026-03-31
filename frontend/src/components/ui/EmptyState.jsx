const EmptyState = ({ icon: Icon, title, description, action = null }) => {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon className="h-6 w-6" />
      </div>
      <div className="empty-state__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
};

export default EmptyState;
