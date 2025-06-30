-- Script para implementação das APIs de contatos de órgãos
BEGIN;

-- Função para obter contatos de um órgão
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

-- Função para adicionar um contato a um órgão
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

-- Função para atualizar um contato de um órgão
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

-- Função para remover um contato de um órgão
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

COMMIT; 