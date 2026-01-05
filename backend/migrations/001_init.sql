-- 001_init.sql
-- Inicializa tabelas base do SST SaaS (usuarios e empresas)

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('visualizador', 'tecnico_seguranca', 'administrador')),
  status TEXT NOT NULL DEFAULT 'ativo',
  telefone TEXT,
  cargo TEXT,
  empresa_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  cnae TEXT NOT NULL,
  ramo TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  conformidade TEXT NOT NULL DEFAULT 'em_dia',
  pendencias INTEGER NOT NULL DEFAULT 0,
  alertas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_usuarios ON usuarios;
CREATE TRIGGER set_updated_at_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_empresas ON empresas;
CREATE TRIGGER set_updated_at_empresas
BEFORE UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

