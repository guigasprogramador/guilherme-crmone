-- Habilitar a extensão uuid-ossp se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alterar a estrutura da tabela users para usar uuid_generate_v4() como valor padrão para o id
ALTER TABLE crmonefactory.users 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verificar e corrigir a estrutura completa da tabela users
DO $$
BEGIN
  -- Adicionar coluna name se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE crmonefactory.users ADD COLUMN name VARCHAR(255) NOT NULL;
  END IF;

  -- Adicionar coluna email se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE crmonefactory.users ADD COLUMN email VARCHAR(255) NOT NULL;
    -- Adicionar restrição de unicidade para email
    ALTER TABLE crmonefactory.users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;

  -- Adicionar coluna password se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE crmonefactory.users ADD COLUMN password VARCHAR(255) NOT NULL;
  END IF;

  -- Adicionar coluna avatar_url se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE crmonefactory.users ADD COLUMN avatar_url VARCHAR(255);
  END IF;

  -- Garantir que a coluna role existe e tem um valor padrão
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    -- Coluna existe, definir valor padrão
    ALTER TABLE crmonefactory.users ALTER COLUMN role SET DEFAULT 'user';
  ELSE
    -- Coluna não existe, criar com valor padrão
    ALTER TABLE crmonefactory.users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
  END IF;

  -- Garantir que a coluna created_at existe e tem um valor padrão
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'created_at'
  ) THEN
    -- Coluna existe, definir valor padrão
    ALTER TABLE crmonefactory.users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  ELSE
    -- Coluna não existe, criar com valor padrão
    ALTER TABLE crmonefactory.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Garantir que a coluna updated_at existe e tem um valor padrão
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'crmonefactory' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    -- Coluna existe, definir valor padrão
    ALTER TABLE crmonefactory.users ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
  ELSE
    -- Coluna não existe, criar com valor padrão
    ALTER TABLE crmonefactory.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Criar tabelas relacionadas se não existirem
-- Tabela refresh_tokens
CREATE TABLE IF NOT EXISTS crmonefactory.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela user_profiles
CREATE TABLE IF NOT EXISTS crmonefactory.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  bio TEXT,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela user_preferences
CREATE TABLE IF NOT EXISTS crmonefactory.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comentário para garantir execução completa
COMMENT ON SCHEMA crmonefactory IS 'Schema para o sistema CRM One Factory';
