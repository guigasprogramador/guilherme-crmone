-- Inserir um usuário de teste para login
-- Senha: 123456 (em texto limpo para facilitar testes)
INSERT INTO crmonefactory.usuarios (nome, email, senha, ativo, role, data_criacao, data_atualizacao)
VALUES
  ('Usuário de Teste', 'teste@example.com', '$2b$10$yw.DXsdD39mJc/Jt5/c1TeGt6O2JzLJJC/Hl0GWppR5Y3rFBIwzVO', true, 'admin', now(), now())
ON CONFLICT (email) DO NOTHING;

-- Adicionar tabela refresh_tokens se não existir
CREATE TABLE IF NOT EXISTS crmonefactory.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (user_id) REFERENCES crmonefactory.usuarios(id) ON DELETE CASCADE
);

-- Adicionar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON crmonefactory.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON crmonefactory.refresh_tokens(token);

-- Mensagem para o usuário
SELECT 'Usuário de teste criado com sucesso! Email: teste@example.com, Senha: 123456' as mensagem;
