const PageHeader = ({ eyebrow, title, description, actions = null, children = null }) => {
  return (
    <section className="page-header">
      <div className="page-header__body">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <div className="page-header__headline">
          <div>
            <h1 className="page-header__title">{title}</h1>
            {description ? <p className="page-header__description">{description}</p> : null}
          </div>
          {actions ? <div className="page-header__actions">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
};

export default PageHeader;
