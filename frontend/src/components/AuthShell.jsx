import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  ClipboardList,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

const fieldSignals = [
  {
    label: 'Operacao em campo',
    value: 'Empresas, setores e riscos conectados em uma unica trilha'
  },
  {
    label: 'Ritmo documental',
    value: 'PGR, LTCAT, PPP e evidencias preparados para revisao tecnica'
  },
  {
    label: 'Controle recorrente',
    value: 'Pendencias, treinamentos e vencimentos visiveis antes do atraso'
  }
];

const moduleHighlights = [
  { icon: ClipboardList, label: 'Inventario e plano de acao' },
  { icon: FileCheck2, label: 'Documentos e conformidade' },
  { icon: Activity, label: 'Agenda operacional' }
];

const AuthShell = ({
  eyebrow,
  title,
  description,
  switchPrompt,
  switchLabel,
  switchTo,
  footerNote,
  children
}) => {
  return (
    <div className="auth-shell">
      <div className="auth-shell__grid">
        <section className="auth-hero">
          <div className="auth-hero__image" />
          <div className="auth-hero__veil" />
          <div className="auth-hero__mesh" />

          <div className="auth-hero__content">
            <div className="auth-hero__mark">
              <ShieldCheck className="h-5 w-5" />
              Plataforma enterprise para SST
            </div>

            <p className="auth-hero__brand">SST SaaS</p>
            <h1 className="auth-hero__headline">Comando operacional para seguranca do trabalho.</h1>
            <p className="auth-hero__summary">
              Estruture empresas, ambientes, cargos, riscos, documentos e prazos em um fluxo tecnico
              continuo, com leitura clara para quem opera e para quem decide.
            </p>

            <div className="auth-hero__signals" aria-label="Destaques do produto">
              {fieldSignals.map((item) => (
                <div key={item.label} className="auth-hero__signal">
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-hero__rail">
            {moduleHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="auth-hero__rail-item">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="auth-panel">
          <div className="auth-panel__inner">
            <div className="auth-panel__topline">
              <div>
                <p className="auth-panel__eyebrow">{eyebrow}</p>
                <h2 className="auth-panel__title">{title}</h2>
              </div>
              <Link className="auth-panel__switch" to={switchTo}>
                {switchLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="auth-panel__description">{description}</p>
            <p className="auth-panel__prompt">{switchPrompt}</p>

            <div className="auth-panel__modules" aria-label="Modulos principais">
              {moduleHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="auth-panel__module">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            {children}

            <p className="auth-panel__footer">{footerNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AuthShell;
