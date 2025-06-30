-- Verificando e corrigindo restrições de chave estrangeira na tabela users

-- Primeiro, vamos ver todas as restrições de chave estrangeira na tabela
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'crmonefactory.users'::regclass AND contype = 'f';

-- Remover a restrição problemática
ALTER TABLE crmonefactory.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Verificando todas as chaves estrangeiras que referenciam a tabela users
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE confrelid = 'crmonefactory.users'::regclass AND contype = 'f';

-- Método alternativo: recriando a tabela users do zero sem a restrição problemática
-- (Só executar se a solução acima não funcionar)
/*
-- Criar uma tabela temporária com a estrutura correta
CREATE TABLE crmonefactory.users_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Desativar temporariamente as restrições em tabelas relacionadas
ALTER TABLE crmonefactory.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE crmonefactory.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE crmonefactory.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Migrar os dados existentes (se houver)
INSERT INTO crmonefactory.users_new (id, name, email, password, role, avatar_url, created_at, updated_at)
SELECT id, name, email, password, role, avatar_url, created_at, updated_at
FROM crmonefactory.users;

-- Remover a tabela antiga e renomear a nova
DROP TABLE crmonefactory.users;
ALTER TABLE crmonefactory.users_new RENAME TO users;

-- Recriar as relações de chave estrangeira corretamente
ALTER TABLE crmonefactory.refresh_tokens 
  ADD CONSTRAINT refresh_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES crmonefactory.users(id) ON DELETE CASCADE;

ALTER TABLE crmonefactory.user_profiles 
  ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES crmonefactory.users(id) ON DELETE CASCADE;

ALTER TABLE crmonefactory.user_preferences 
  ADD CONSTRAINT user_preferences_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES crmonefactory.users(id) ON DELETE CASCADE;
*/

-- Confirmação final - verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'crmonefactory' AND table_name = 'users'
ORDER BY ordinal_position;
