import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import AuthShell from '../components/AuthShell';

const RecuperarSenha = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthShell
      eyebrow="Recuperacao assistida"
      title="Recupere o acesso com contexto."
      description="A camada de redefinicao ainda depende de fluxo assistido. Esta tela organiza a solicitacao e reduz atrito para o operador."
      switchPrompt="Lembrou a senha?"
      switchLabel="Voltar ao login"
      switchTo="/login"
      footerNote="Para producao, conecte este fluxo ao endpoint de redefinicao do backend antes de liberar autoatendimento."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="recuperacao-email">Email da conta</label>
          <div className="auth-field__control">
            <Mail className="h-4 w-4" />
            <input
              id="recuperacao-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-submit">
          <Send className="h-4 w-4" />
          Registrar solicitacao
        </button>

        {submitted ? (
          <div className="auth-note">
            <strong>Solicitacao preparada.</strong>
            <p>
              Nesta base atual, a redefinicao depende do backend e do administrador. Use este email como
              referencia operacional e finalize o fluxo quando o endpoint estiver disponivel.
            </p>
          </div>
        ) : (
          <div className="auth-note">
            <strong>Fluxo planejado para producao.</strong>
            <p>
              A interface esta pronta para um endpoint de recuperacao. Enquanto isso, mantenha a orientacao de
              suporte para usuarios recorrentes.
            </p>
            <Link className="auth-field__link" to="/register">
              Criar acesso inicial
            </Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
};

export default RecuperarSenha;
