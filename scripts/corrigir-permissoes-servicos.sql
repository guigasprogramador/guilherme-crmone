-- Script para corrigir permissões na tabela licitacao_servicos
BEGIN;

-- Remover políticas de segurança por linha (RLS) existentes para a tabela
DROP POLICY IF EXISTS "Allow all for licitacao_servicos" ON crmonefactory.licitacao_servicos;

-- Garantir que RLS está ativado na tabela
ALTER TABLE crmonefactory.licitacao_servicos ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações na tabela licitacao_servicos
CREATE POLICY "Allow all for licitacao_servicos" 
ON crmonefactory.licitacao_servicos 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- Garantir que as permissões de acesso estão corretas
GRANT ALL PRIVILEGES ON TABLE crmonefactory.licitacao_servicos TO anon, authenticated, service_role;

-- Verificar se a tabela tem as colunas necessárias
DO $$
BEGIN
    -- Verificar se a coluna data_criacao existe, se não, criar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'crmonefactory' 
                  AND table_name = 'licitacao_servicos' 
                  AND column_name = 'data_criacao') THEN
        ALTER TABLE crmonefactory.licitacao_servicos 
        ADD COLUMN data_criacao TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Verificar se a coluna data_atualizacao existe, se não, criar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'crmonefactory' 
                  AND table_name = 'licitacao_servicos' 
                  AND column_name = 'data_atualizacao') THEN
        ALTER TABLE crmonefactory.licitacao_servicos 
        ADD COLUMN data_atualizacao TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

COMMIT;