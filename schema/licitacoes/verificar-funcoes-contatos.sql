-- Script para verificar e recriar as funções de API de contatos
BEGIN;

-- Verificar se a tabela orgao_contatos existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'crmonefactory' 
    AND table_name = 'orgao_contatos'
  ) THEN
    -- Criar a tabela se não existir
    CREATE TABLE crmonefactory.orgao_contatos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      orgao_id UUID NOT NULL REFERENCES crmonefactory.orgaos(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      cargo VARCHAR(100),
      email VARCHAR(255),
      telefone VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Ativar RLS
    ALTER TABLE crmonefactory.orgao_contatos ENABLE ROW LEVEL SECURITY;

    -- Criar política de segurança
    CREATE POLICY "Allow all for orgao_contatos" 
    ON crmonefactory.orgao_contatos 
    FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;

-- Recriar as funções de API
CREATE OR REPLACE FUNCTION crmonefactory.api_get_orgao_contatos(
  p_orgao_id UUID
)
RETURNS SETOF crmonefactory.orgao_contatos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.orgao_contatos
  WHERE orgao_id = p_orgao_id
  ORDER BY nome;
END;
$$;

CREATE OR REPLACE FUNCTION crmonefactory.api_create_orgao_contato(
  p_orgao_id UUID,
  p_nome TEXT,
  p_cargo TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL
)
RETURNS crmonefactory.orgao_contatos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contato crmonefactory.orgao_contatos;
BEGIN
  INSERT INTO crmonefactory.orgao_contatos (
    orgao_id,
    nome,
    cargo,
    email,
    telefone
  ) VALUES (
    p_orgao_id,
    p_nome,
    p_cargo,
    p_email,
    p_telefone
  )
  RETURNING * INTO v_contato;
  
  RETURN v_contato;
END;
$$;

CREATE OR REPLACE FUNCTION crmonefactory.api_update_orgao_contato(
  p_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL
)
RETURNS crmonefactory.orgao_contatos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contato crmonefactory.orgao_contatos;
BEGIN
  UPDATE crmonefactory.orgao_contatos
  SET
    nome = COALESCE(p_nome, nome),
    cargo = COALESCE(p_cargo, cargo),
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id
  RETURNING * INTO v_contato;
  
  RETURN v_contato;
END;
$$;

CREATE OR REPLACE FUNCTION crmonefactory.api_delete_orgao_contato(
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM crmonefactory.orgao_contatos
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION crmonefactory.api_get_orgao_contatos TO anon, authenticated;
GRANT EXECUTE ON FUNCTION crmonefactory.api_create_orgao_contato TO anon, authenticated;
GRANT EXECUTE ON FUNCTION crmonefactory.api_update_orgao_contato TO anon, authenticated;
GRANT EXECUTE ON FUNCTION crmonefactory.api_delete_orgao_contato TO anon, authenticated;

COMMIT; 