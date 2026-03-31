import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const FormModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onSubmit, 
  submitText = 'Salvar',
  loading = false,
  error = null,
  showFooter = true,
  asForm = true
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div
          className={`relative w-full max-w-3xl transform overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Edicao guiada</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-5 flex items-center space-x-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {asForm ? (
            <form onSubmit={onSubmit} className="px-6 py-4">
              {children}

              {showFooter && (
                <div className="mt-8 flex justify-end space-x-3 border-t border-slate-200/80 pt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center space-x-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/10 border-t-slate-900" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{submitText}</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="px-6 py-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormModal;

