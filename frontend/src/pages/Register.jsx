import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, User2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
    setError('');
  };

  const validateForm = () => {
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas nao coincidem.');
      return false;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha
      });

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Nao foi possivel criar a conta.');
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Novo acesso"
      title="Ative um novo operador."
      description="Crie a entrada inicial para estruturar empresas, inventarios e ciclos documentais em uma camada unica de execucao."
      switchPrompt="Ja possui credenciais?"
      switchLabel="Fazer login"
      switchTo="/login"
      footerNote="O cadastro publico cria um perfil visualizador. Elevacao administrativa continua sob governanca do backend."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="auth-alert" role="alert">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="auth-field">
          <label htmlFor="nome">Nome completo</label>
          <div className="auth-field__control">
            <User2 className="h-4 w-4" />
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Nome do operador"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email corporativo</label>
          <div className="auth-field__control">
            <Mail className="h-4 w-4" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="voce@empresa.com"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="senha">Senha</label>
          <div className="auth-field__control">
            <LockKeyhole className="h-4 w-4" />
            <input
              id="senha"
              name="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.senha}
              onChange={handleChange}
              placeholder="Minimo de 6 caracteres"
              required
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <div className="auth-field__control">
            <LockKeyhole className="h-4 w-4" />
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.confirmarSenha}
              onChange={handleChange}
              placeholder="Repita a senha"
              required
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ocultar confirmacao' : 'Mostrar confirmacao'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-submit">
          {loading ? 'Criando conta...' : 'Criar acesso inicial'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
