import { useEffect, useMemo, useState } from 'react';
import { usuariosService } from '../../services/api';

const DEFAULT_FORM = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'visualizador',
  status: 'ativo',
  telefone: '',
  cargo: '',
  empresaId: ''
};

const perfilFromAcessos = ({ canChecklists, canUsers }) => {
  if (canUsers) return 'administrador';
  if (canChecklists) return 'tecnico_seguranca';
  return 'visualizador';
};

const acessosFromPerfil = (perfil) => {
  if (perfil === 'administrador') return { canChecklists: true, canUsers: true };
  if (perfil === 'tecnico_seguranca') return { canChecklists: true, canUsers: false };
  if (perfil === 'auditor') return { canChecklists: false, canUsers: false };
  return { canChecklists: false, canUsers: false };
};

const UsuarioForm = ({ usuario, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [canChecklists, setCanChecklists] = useState(false);
  const [canUsers, setCanUsers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuario) {
      const merged = {
        ...DEFAULT_FORM,
        ...usuario,
        senha: '' // Não mostrar senha existente
      };
      const acessos = acessosFromPerfil(merged.perfil);
      setFormData(merged);
      setCanChecklists(acessos.canChecklists);
      setCanUsers(acessos.canUsers);
      return;
    }
    setFormData({ ...DEFAULT_FORM });
    setCanChecklists(false);
    setCanUsers(false);
  }, [usuario]);

  const acessosPreview = useMemo(() => {
    return [
      { id: 'dashboard', label: 'Dashboard', required: true },
      { id: 'empresas', label: 'Empresas', required: true },
      { id: 'sst', label: 'Dashboard SST', required: true },
      { id: 'tarefas', label: 'Tarefas', required: true },
      { id: 'cipa', label: 'CIPA', required: true },
      { id: 'treinamentos', label: 'Treinamentos', required: true },
      { id: 'acoes', label: 'Ações', required: true },
      { id: 'agenda', label: 'Agenda', required: true },
      { id: 'incidentes', label: 'Incidentes', required: true },
      { id: 'documentos', label: 'Documentos', required: true },
      { id: 'relatorios', label: 'Relatórios', required: true },
      {
        id: 'checklists',
        label: 'Checklists e inspeções',
        required: false,
        enabled: canChecklists
      },
      {
        id: 'usuarios',
        label: 'Gestão de usuários',
        required: false,
        enabled: canUsers
      }
    ];
  }, [canChecklists, canUsers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'perfil') {
      const acessos = acessosFromPerfil(value);
      setCanChecklists(acessos.canChecklists);
      setCanUsers(acessos.canUsers);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleChecklists = (nextValue) => {
    if (!nextValue && canUsers) return;

    const perfil = perfilFromAcessos({ canChecklists: nextValue, canUsers });
    setCanChecklists(nextValue);
    setFormData((prev) => ({ ...prev, perfil }));
  };

  const handleToggleUsers = (nextValue) => {
    const nextChecklists = nextValue ? true : canChecklists;
    const perfil = perfilFromAcessos({ canChecklists: nextChecklists, canUsers: nextValue });
    setCanUsers(nextValue);
    setCanChecklists(nextChecklists);
    setFormData((prev) => ({ ...prev, perfil }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSend = { ...formData };
      
      // Se não é um novo usuário e senha está vazia, remover do envio
      if (usuario && !dataToSend.senha) {
        delete dataToSend.senha;
      }

      if (usuario) {
        await usuariosService.update(usuario.id, dataToSend);
      } else {
        await usuariosService.create(dataToSend);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Digite o nome completo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="usuario@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha {!usuario && '*'}
          </label>
          <input
            type="password"
            name="senha"
            value={formData.senha}
            onChange={handleChange}
            required={!usuario}
            className="input-field"
            placeholder={usuario ? "Deixe em branco para manter a senha atual" : "Digite a senha"}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cargo (perfil) *
          </label>
          <select
            name="perfil"
            value={formData.perfil}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="visualizador">Visualizador</option>
            <option value="auditor">Auditor</option>
            <option value="tecnico_seguranca">Técnico de Segurança</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input-field"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="suspenso">Suspenso</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="text"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            className="input-field"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cargo
          </label>
          <input
            type="text"
            name="cargo"
            value={formData.cargo}
            onChange={handleChange}
            className="input-field"
            placeholder="Cargo na empresa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa
          </label>
          <input
            type="text"
            name="empresaId"
            value={formData.empresaId}
            onChange={handleChange}
            className="input-field"
            placeholder="ID da empresa (opcional)"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Acessos</h4>
          <p className="text-xs text-gray-500">
            O sistema usa perfis. Ajustar os acessos abaixo atualiza automaticamente o cargo (perfil).
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <input type="checkbox" checked readOnly className="mt-1" />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Acesso básico (sempre)</div>
              <div className="text-gray-600">
                {acessosPreview
                  .filter((item) => item.required)
                  .map((item) => item.label)
                  .join(' • ')}
              </div>
            </div>
          </div>

          <label className={`flex items-start gap-3 ${canUsers ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              className="mt-1"
              checked={canChecklists}
              disabled={canUsers}
              onChange={(e) => handleToggleChecklists(e.target.checked)}
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Checklists e inspeções</div>
              <div className="text-gray-600">Acessar Checklists e iniciar inspeções por NR/CNAE.</div>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={canUsers}
              onChange={(e) => handleToggleUsers(e.target.checked)}
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Gestão de usuários</div>
              <div className="text-gray-600">Acessar tela de Usuários e gerenciar permissões.</div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default UsuarioForm;
