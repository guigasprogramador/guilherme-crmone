-- Adicionar tabelas para serviços e resumo de licitações

-- Tabela para armazenar serviços associados a licitações
CREATE TABLE IF NOT EXISTS crmonefactory.licitacao_servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacao_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15, 2),
  unidade VARCHAR(50),
  quantidade INTEGER,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE
);

-- Tabela para armazenar resumos de licitações
CREATE TABLE IF NOT EXISTS crmonefactory.licitacao_resumos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacao_id UUID NOT NULL UNIQUE,
  conteudo TEXT,
  pontos_importantes TEXT[],
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_licitacao_servicos_licitacao_id ON crmonefactory.licitacao_servicos(licitacao_id);
CREATE INDEX IF NOT EXISTS idx_licitacao_resumos_licitacao_id ON crmonefactory.licitacao_resumos(licitacao_id);

-- Adicionar políticas de segurança por linha (RLS)
ALTER TABLE crmonefactory.licitacao_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crmonefactory.licitacao_resumos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela licitacao_servicos
CREATE POLICY "Allow all for licitacao_servicos" 
ON crmonefactory.licitacao_servicos 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Criar políticas para a tabela licitacao_resumos
CREATE POLICY "Allow all for licitacao_resumos" 
ON crmonefactory.licitacao_resumos 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);