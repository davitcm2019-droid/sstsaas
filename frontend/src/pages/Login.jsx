import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    senha: ''
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const resetFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const emailIsValid = (value) => /\S+@\S+\.\S+/.test(String(value).trim());

  const validateBeforeSubmit = () => {
    const errors = {};

    if (!emailIsValid(formData.email)) {
      errors.email = 'Informe um email valido.';
    }

    if (String(formData.senha).trim().length < 6) {
      errors.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    }

    if (Object.keys(errors).length) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return false;
    }

    return true;
  };

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
    resetFieldError(event.target.name);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    setFieldErrors({ email: '', senha: '' });

    if (!validateBeforeSubmit()) {
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.senha);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Nao foi possivel autenticar.');
      }
    } catch (submitError) {
      const apiCode = submitError?.response?.data?.meta?.code;

      if (apiCode === 'AUTH_USER_NOT_FOUND') {
        setFieldErrors((prev) => ({ ...prev, email: 'Usuario nao encontrado.' }));
        setError('Usuario nao encontrado.');
      } else if (apiCode === 'AUTH_INVALID_PASSWORD') {
        setFieldErrors((prev) => ({ ...prev, senha: 'Senha incorreta.' }));
        setError('Senha incorreta.');
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Acesso seguro"
      title="Entre no centro operacional."
      description="Acesse a carteira de empresas, acompanhe prioridades e mova a operacao SST sem perder contexto tecnico."
      switchPrompt="Ainda nao tem acesso?"
      switchLabel="Criar conta"
      switchTo="/register"
      footerNote="A autenticacao respeita perfil e permissao por modulo. Auditoria e rastreabilidade permanecem no backend."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="auth-alert" role="alert">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}

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
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-feedback' : undefined}
              required
            />
          </div>
          {fieldErrors.email ? (
            <p id="email-feedback" className="auth-field__feedback auth-field__feedback--error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label htmlFor="senha">Senha</label>
            <Link className="auth-field__link" to="/recuperar-senha">
              Recuperar acesso
            </Link>
          </div>
          <div className="auth-field__control">
            <LockKeyhole className="h-4 w-4" />
            <input
              id="senha"
              name="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.senha}
              onChange={handleChange}
              placeholder="Sua senha"
              aria-invalid={Boolean(fieldErrors.senha)}
              aria-describedby={fieldErrors.senha ? 'senha-feedback' : undefined}
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
          {fieldErrors.senha ? (
            <p id="senha-feedback" className="auth-field__feedback auth-field__feedback--error">
              {fieldErrors.senha}
            </p>
          ) : null}
        </div>

        <button type="submit" disabled={loading} className="auth-submit">
          {loading ? 'Autenticando...' : 'Entrar na operacao'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
