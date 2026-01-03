import React, { useState, useEffect } from 'react';
import { usuariosService } from '../../services/api';

const UsuarioForm = ({ usuario, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'visualizador',
    status: 'ativo',
    telefone: '',
    cargo: '',
    empresaId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuario) {
      setFormData({
        ...usuario,
        senha: '' // Não mostrar senha existente
      });
    }
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
            Perfil *
          </label>
          <select
            name="perfil"
            value={formData.perfil}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="visualizador">Visualizador</option>
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
    </form>
  );
};

export default UsuarioForm;
