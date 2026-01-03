import React, { useState, useEffect } from 'react';
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
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div 
          className={`relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          style={{ width: '90%', maxWidth: '600px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 flex items-center space-x-2 rounded-md bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form Content */}
          {asForm ? (
            <form onSubmit={onSubmit} className="px-6 py-4">
              {children}
              
              {/* Footer */}
              {showFooter && (
                <div className="mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4">
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
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

