-- Adiciona as colunas que estão faltando na tabela crmonefactory.users

ALTER TABLE crmonefactory.users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL UNIQUE,
ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL,
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- Garantir que as tabelas complementares existam
CREATE TABLE IF NOT EXISTS crmonefactory.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crmonefactory.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  bio TEXT,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crmonefactory.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_email ON crmonefactory.users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON crmonefactory.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON crmonefactory.refresh_tokens(token);

-- Garantir permissões para o role anon e authenticated
GRANT USAGE ON SCHEMA crmonefactory TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crmonefactory TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA crmonefactory TO anon;
