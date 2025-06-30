-- Script para corrigir problemas na tabela doc
-- Este script pode ser executado com segurança várias vezes

-- Remover políticas existentes caso estejam causando problemas
DO $$ 
BEGIN
    -- Tenta remover as políticas - não importa se elas não existem
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os documentos" ON crmonefactory.doc;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover política SELECT: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem inserir documentos" ON crmonefactory.doc;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover política INSERT: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem atualizar documentos" ON crmonefactory.doc;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover política UPDATE: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem excluir documentos" ON crmonefactory.doc;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover política DELETE: %', SQLERRM;
    END;
END $$;

-- Criar políticas de acesso
CREATE POLICY "Usuários autenticados podem ver todos os documentos"
  ON crmonefactory.doc
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir documentos"
  ON crmonefactory.doc
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar documentos"
  ON crmonefactory.doc
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem excluir documentos"
  ON crmonefactory.doc
  FOR DELETE
  TO authenticated
  USING (true);

-- Dar permissões ao papel anon e authenticated (caso não tenham sido dadas)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE crmonefactory.doc TO anon, authenticated;
GRANT USAGE ON SCHEMA crmonefactory TO anon, authenticated;
