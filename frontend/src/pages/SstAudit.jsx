import { useEffect, useState } from 'react';
import { History, Shield } from 'lucide-react';

import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { sstService } from '../services/api';

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleString('pt-BR');
};

const SstAudit = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ entityType: '', action: '' });

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await sstService.listAudit(filters);
        setItems(response.data.data || []);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar auditoria tecnica.');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.entityType, filters.action]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Governanca tecnica" title="Auditoria" description="Trilha separada do log operacional, com antes/depois, usuario e entidade impactada.">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input-field" placeholder="Filtrar por entidade" value={filters.entityType} onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))} />
          <input className="input-field" placeholder="Filtrar por acao" value={filters.action} onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))} />
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="panel-surface p-6">
        {!items.length ? (
          <EmptyState icon={Shield} title="Nenhum evento de auditoria" description="Os eventos tecnicos do novo SST aparecerao aqui conforme a operacao avancar." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill status-info">{item.entityType}</span>
                      <span className="status-pill status-info">{item.action}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{item.summary || 'Evento tecnico'}</h3>
                    <p className="mt-2 text-sm text-slate-600">Entidade: {item.entityId}</p>
                    <p className="mt-2 text-xs text-slate-500">Usuario: {item.actor?.nome || 'Nao identificado'} • Origem: {item.origin || 'manual'}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
                    <History className="mb-2 h-4 w-4 text-slate-700" />
                    {formatDate(item.createdAt)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SstAudit;
