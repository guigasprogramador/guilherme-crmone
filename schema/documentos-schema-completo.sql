-- Schema Completo para a Tabela de Documentos
-- Inclui definição completa da tabela, índices e relacionamentos

-- 1. Criação da tabela principal de documentos (se não existir)
CREATE TABLE IF NOT EXISTS crmonefactory.documentos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipo text NOT NULL,
  categorias text[] NOT NULL DEFAULT ARRAY[]::text[],
  categoria text NULL, -- Mantida para compatibilidade com código legado
  descricao text,
  licitacao_id uuid REFERENCES crmonefactory.licitacoes(id) ON DELETE SET NULL,
  numero_documento text,
  data_validade timestamptz,
  url_documento text,
  arquivo_path text,
  formato text,
  tamanho bigint,
  status text NOT NULL DEFAULT 'ativo',
  criado_por uuid REFERENCES auth.users(id),
  data_criacao timestamptz NOT NULL DEFAULT now(),
  data_atualizacao timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_documentos_licitacao 
ON crmonefactory.documentos(licitacao_id);

CREATE INDEX IF NOT EXISTS idx_documentos_categorias 
ON crmonefactory.documentos USING GIN (categorias);

CREATE INDEX IF NOT EXISTS idx_documentos_status 
ON crmonefactory.documentos(status);

CREATE INDEX IF NOT EXISTS idx_documentos_tipo 
ON crmonefactory.documentos(tipo);

-- 3. Trigger para atualizar o campo data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION crmonefactory.documentos_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.data_atualizacao = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS atualizar_data_documento ON crmonefactory.documentos;
CREATE TRIGGER atualizar_data_documento
BEFORE UPDATE ON crmonefactory.documentos
FOR EACH ROW EXECUTE FUNCTION crmonefactory.documentos_atualizar_timestamp();

-- 4. Funções de Utilidade para Documentos

-- 4.1 Buscar documentos por categoria
CREATE OR REPLACE FUNCTION crmonefactory.documentos_por_categoria(categoria_busca text)
RETURNS SETOF crmonefactory.documentos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.documentos
  WHERE categoria_busca = ANY (categorias) AND status != 'excluido';
END;
$$ LANGUAGE plpgsql;

-- 4.2 Buscar documentos com várias categorias (OR - qualquer uma das categorias)
CREATE OR REPLACE FUNCTION crmonefactory.documentos_com_qualquer_categoria(categorias_busca text[])
RETURNS SETOF crmonefactory.documentos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.documentos
  WHERE categorias && categorias_busca AND status != 'excluido';
END;
$$ LANGUAGE plpgsql;

-- 4.3 Buscar documentos com todas as categorias (AND - todas as categorias)
CREATE OR REPLACE FUNCTION crmonefactory.documentos_com_todas_categorias(categorias_busca text[])
RETURNS SETOF crmonefactory.documentos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.documentos
  WHERE categorias @> categorias_busca AND status != 'excluido';
END;
$$ LANGUAGE plpgsql;

-- 5. Permissões RLS (Row Level Security)
ALTER TABLE crmonefactory.documentos ENABLE ROW LEVEL SECURITY;

-- Política para permissão de leitura
CREATE POLICY documentos_select ON crmonefactory.documentos 
FOR SELECT USING (
  (auth.uid() IN (SELECT id FROM crmonefactory.users_roles WHERE role IN ('admin', 'editor', 'viewer')))
);

-- Política para permissão de inserção
CREATE POLICY documentos_insert ON crmonefactory.documentos 
FOR INSERT WITH CHECK (
  (auth.uid() IN (SELECT id FROM crmonefactory.users_roles WHERE role IN ('admin', 'editor')))
);

-- Política para permissão de atualização
CREATE POLICY documentos_update ON crmonefactory.documentos 
FOR UPDATE USING (
  (auth.uid() IN (SELECT id FROM crmonefactory.users_roles WHERE role IN ('admin', 'editor')))
);

-- Política para permissão de exclusão (soft delete preferido sobre exclusão real)
CREATE POLICY documentos_delete ON crmonefactory.documentos 
FOR DELETE USING (
  (auth.uid() IN (SELECT id FROM crmonefactory.users_roles WHERE role IN ('admin')))
);

-- EXEMPLOS DE USO:

-- Inserir um documento com múltiplas categorias
-- INSERT INTO crmonefactory.documentos (nome, tipo, categorias, descricao)
-- VALUES ('Contrato ABC', 'contrato', ARRAY['juridicos', 'licitacao'], 'Contrato para licitação XYZ');

-- Buscar todos os documentos com a tag 'licitacao'
-- SELECT * FROM crmonefactory.documentos_por_categoria('licitacao');

-- Buscar documentos com tag 'licitacao' OU 'comercial'
-- SELECT * FROM crmonefactory.documentos_com_qualquer_categoria(ARRAY['licitacao', 'comercial']);

-- Buscar documentos que tenham AMBAS as tags 'licitacao' E 'comercial'
-- SELECT * FROM crmonefactory.documentos_com_todas_categorias(ARRAY['licitacao', 'comercial']);
