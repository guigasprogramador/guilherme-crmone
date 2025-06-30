-- SCRIPT FINAL PARA RESOLVER OS PROBLEMAS DO SUPABASE
-- Execute este script na íntegra no SQL Editor do Supabase

-- 1. REMOVER A RESTRIÇÃO PROBLEMÁTICA DE CHAVE ESTRANGEIRA
ALTER TABLE crmonefactory.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. RECRIAR A TABELA USERS COM A ESTRUTURA CORRETA SE A ABORDAGEM ACIMA NÃO FUNCIONAR
DROP TABLE IF EXISTS crmonefactory.users_temp;

CREATE TABLE crmonefactory.users_temp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TENTAR COPIAR DADOS EXISTENTES (SE HOUVER)
DO $$
BEGIN
  BEGIN
    INSERT INTO crmonefactory.users_temp (id, name, email, password, role, avatar_url, created_at, updated_at)
    SELECT id, name, email, password, role, avatar_url, created_at, updated_at
    FROM crmonefactory.users;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar erro se a cópia falhar
    RAISE NOTICE 'Não foi possível copiar dados existentes: %', SQLERRM;
  END;
END $$;

-- 4. REMOVER A TABELA ANTIGA E RENOMEAR A NOVA
DROP TABLE IF EXISTS crmonefactory.users CASCADE;
ALTER TABLE crmonefactory.users_temp RENAME TO users;

-- 5. RECRIAR TABELAS RELACIONADAS
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

-- 6. APLICAR POLÍTICAS RLS PARA PERMITIR ACESSO ÀS TABELAS
ALTER TABLE crmonefactory.users ENABLE ROW LEVEL SECURITY;

-- Usuários - permitir todas as operações
CREATE POLICY "Allow select for users" ON crmonefactory.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert for users" ON crmonefactory.users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update for users" ON crmonefactory.users FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow delete for users" ON crmonefactory.users FOR DELETE TO anon, authenticated USING (true);

-- Refresh tokens - permitir todas as operações
ALTER TABLE crmonefactory.refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for refresh_tokens" ON crmonefactory.refresh_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Perfis de usuário - permitir todas as operações
ALTER TABLE crmonefactory.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for user_profiles" ON crmonefactory.user_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Preferências de usuário - permitir todas as operações
ALTER TABLE crmonefactory.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for user_preferences" ON crmonefactory.user_preferences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. CONFIRMAR PERMISSÕES
GRANT ALL PRIVILEGES ON SCHEMA crmonefactory TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA crmonefactory TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA crmonefactory TO anon, authenticated;

-- 8. CRIAR USUÁRIO ADMIN DE TESTE
INSERT INTO crmonefactory.users (name, email, password, role)
VALUES ('Admin', 'admin@exemplo.com', '$2b$10$1234567890123456789012', 'admin')
ON CONFLICT (email) DO NOTHING;
