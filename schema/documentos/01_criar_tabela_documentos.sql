-- Script para atualizar a tabela de documentos no schema crmonefactory
-- Este script deve ser executado no Supabase SQL Editor

-- Verificar se as colunas existem e adicionar caso não existam
DO $$
BEGIN
    -- Verificar coluna categoria
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'crmonefactory' 
        AND table_name = 'documentos' 
        AND column_name = 'categoria'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN categoria TEXT;
        RAISE NOTICE 'Coluna categoria adicionada';
    END IF;

    -- Verificar coluna resumo
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'crmonefactory' 
        AND table_name = 'documentos' 
        AND column_name = 'resumo'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN resumo TEXT;
        RAISE NOTICE 'Coluna resumo adicionada';
    END IF;

    -- Verificar coluna formato
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'crmonefactory' 
        AND table_name = 'documentos' 
        AND column_name = 'formato'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN formato TEXT;
        RAISE NOTICE 'Coluna formato adicionada';
    END IF;

    -- Verificar coluna arquivo
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'crmonefactory' 
        AND table_name = 'documentos' 
        AND column_name = 'arquivo'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN arquivo TEXT;
        RAISE NOTICE 'Coluna arquivo adicionada';
    END IF;

    -- Verificar coluna tamanho
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'crmonefactory' 
        AND table_name = 'documentos' 
        AND column_name = 'tamanho'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN tamanho INTEGER;
        RAISE NOTICE 'Coluna tamanho adicionada';
    END IF;
END
$$;

-- Comentários para a tabela
COMMENT ON TABLE crmonefactory.documentos IS 'Documentos associados às licitações';
COMMENT ON COLUMN crmonefactory.documentos.id IS 'ID único do documento';
COMMENT ON COLUMN crmonefactory.documentos.nome IS 'Nome do documento';
COMMENT ON COLUMN crmonefactory.documentos.url IS 'URL para acesso ao documento';
COMMENT ON COLUMN crmonefactory.documentos.arquivo IS 'Nome do arquivo no storage';
COMMENT ON COLUMN crmonefactory.documentos.tipo IS 'Tipo de documento (ex: proposta, edital, etc)';
COMMENT ON COLUMN crmonefactory.documentos.tamanho IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN crmonefactory.documentos.licitacao_id IS 'ID da licitação associada';
COMMENT ON COLUMN crmonefactory.documentos.formato IS 'Formato do arquivo (pdf, docx, etc)';
COMMENT ON COLUMN crmonefactory.documentos.categoria IS 'Categoria do documento';
COMMENT ON COLUMN crmonefactory.documentos.resumo IS 'Resumo do conteúdo do documento';
COMMENT ON COLUMN crmonefactory.documentos.status IS 'Status do documento (ativo, arquivado, etc)';
COMMENT ON COLUMN crmonefactory.documentos.data_criacao IS 'Data de criação do registro';
COMMENT ON COLUMN crmonefactory.documentos.data_atualizacao IS 'Data da última atualização';
