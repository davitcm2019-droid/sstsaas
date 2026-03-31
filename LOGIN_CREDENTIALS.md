# Credenciais de Login (Exemplo)

Por seguranca, este repositorio nao publica credenciais reais (email/senha) para acesso.

## Como testar localmente

1. Inicie o backend e o frontend.
2. Crie um usuario na tela de registro (`/register`).
3. Se precisar de um administrador, execute `cd backend && npm run admin:create -- --nome "Admin" --email admin@local.test --senha "SenhaForte123"`.
4. Faca login na tela de login (`/login`).

## Observacoes

- Usuarios, empresas, tarefas, eventos, alertas, riscos legados, CIPA, treinamentos, incidentes, documentos, notificacoes e inspecoes agora usam MongoDB e nao sao perdidos ao reiniciar o servidor.
- Para cenarios corporativos, usuarios privilegiados devem ser criados pelo script administrativo ou por fluxo administrativo controlado.
