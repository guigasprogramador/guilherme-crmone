-- SQL para adicionar/modificar o campo categorias na tabela documentos
-- Use quando estiver pronto para atualizar o backend para suportar múltiplas categorias

-- 1. Adicionar a coluna categorias como array de texto se não existir
ALTER TABLE crmonefactory.documentos 
ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 2. Se já existe uma coluna 'categoria' (singular) e deseja migrar os dados antes de removê-la
-- Este comando popula o novo array de categorias com a categoria existente
UPDATE crmonefactory.documentos 
SET categorias = ARRAY[categoria]
WHERE categorias IS NULL OR array_length(categorias, 1) IS NULL;

-- 3. Criar índice GIN para pesquisa eficiente em arrays
CREATE INDEX IF NOT EXISTS idx_documentos_categorias 
ON crmonefactory.documentos USING GIN (categorias);

-- 4. Criar uma função para pesquisar documentos por categoria
CREATE OR REPLACE FUNCTION crmonefactory.documentos_por_categoria(categoria_busca text)
RETURNS SETOF crmonefactory.documentos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.documentos
  WHERE categoria_busca = ANY (categorias) AND status != 'excluido';
END;
$$ LANGUAGE plpgsql;

-- EXEMPLOS DE USO:

-- Para buscar todos os documentos com a tag 'licitacao':
-- SELECT * FROM crmonefactory.documentos WHERE 'licitacao' = ANY (categorias);

-- Usando a função:
-- SELECT * FROM crmonefactory.documentos_por_categoria('licitacao');

-- Para buscar documentos com múltiplas categorias (operador OR - qualquer categoria):
-- SELECT * FROM crmonefactory.documentos WHERE categorias && ARRAY['licitacao', 'comercial'];

-- Para buscar documentos que tenham TODAS as categorias especificadas (operador AND):
-- SELECT * FROM crmonefactory.documentos WHERE categorias @> ARRAY['licitacao', 'comercial'];
