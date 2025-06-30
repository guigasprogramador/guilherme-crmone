-- Script para implementação das APIs do módulo comercial no Supabase
-- Este script complementa o comercial-module.sql e cria as funções necessárias
-- para atender as chamadas de API do frontend

BEGIN;

-- ======================================
-- FUNÇÕES DE API PARA OPORTUNIDADES
-- ======================================

-- Função para obter oportunidades com filtros
CREATE OR REPLACE FUNCTION crmonefactory.api_get_oportunidades(
  p_termo TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_cliente TEXT DEFAULT NULL,
  p_responsavel TEXT DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS SETOF crmonefactory.view_oportunidades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.view_oportunidades vo
  WHERE
    -- Filtro por termo (busca em título, descrição e cliente)
    (p_termo IS NULL OR 
      vo.titulo ILIKE '%' || p_termo || '%' OR 
      vo.descricao ILIKE '%' || p_termo || '%' OR
      vo.cliente_nome ILIKE '%' || p_termo || '%')
    -- Filtro por status
    AND (p_status IS NULL OR p_status = 'todos' OR vo.status = p_status)
    -- Filtro por cliente
    AND (p_cliente IS NULL OR p_cliente = 'todos' OR vo.cliente_id::text = p_cliente OR vo.cliente_nome = p_cliente)
    -- Filtro por responsável
    AND (p_responsavel IS NULL OR p_responsavel = 'todos' OR vo.responsavel_id::text = p_responsavel OR vo.responsavel_nome = p_responsavel)
    -- Filtro por data início (prazo >= data_inicio)
    AND (p_data_inicio IS NULL OR vo.prazo >= p_data_inicio)
    -- Filtro por data fim (prazo <= data_fim)
    AND (p_data_fim IS NULL OR vo.prazo <= p_data_fim)
  ORDER BY vo.data_atualizacao DESC;
END;
$$;

-- Função para obter uma oportunidade específica por ID
CREATE OR REPLACE FUNCTION crmonefactory.api_get_oportunidade(
  p_id UUID
)
RETURNS crmonefactory.view_oportunidades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result crmonefactory.view_oportunidades;
BEGIN
  SELECT *
  INTO v_result
  FROM crmonefactory.view_oportunidades
  WHERE id = p_id;
  
  RETURN v_result;
END;
$$;

-- Função para criar uma nova oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.api_create_oportunidade(
  p_titulo TEXT,
  p_cliente_id UUID,
  p_valor DECIMAL,
  p_responsavel_id UUID,
  p_prazo DATE,
  p_status TEXT DEFAULT 'novo_lead',
  p_descricao TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT 'produto',
  p_tipo_faturamento TEXT DEFAULT 'direto',
  p_data_reuniao DATE DEFAULT NULL,
  p_hora_reuniao TIME DEFAULT NULL
)
RETURNS crmonefactory.view_oportunidades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_result crmonefactory.view_oportunidades;
BEGIN
  -- Inserir a nova oportunidade
  INSERT INTO crmonefactory.oportunidades (
    titulo,
    cliente_id,
    valor,
    responsavel_id,
    prazo,
    status,
    descricao,
    tipo,
    tipo_faturamento,
    data_reuniao,
    hora_reuniao,
    data_criacao,
    data_atualizacao
  ) VALUES (
    p_titulo,
    p_cliente_id,
    p_valor,
    p_responsavel_id,
    p_prazo,
    p_status,
    p_descricao,
    p_tipo,
    p_tipo_faturamento,
    p_data_reuniao,
    p_hora_reuniao,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_id;
  
  -- Retornar a oportunidade criada
  SELECT *
  INTO v_result
  FROM crmonefactory.view_oportunidades
  WHERE id = v_id;
  
  RETURN v_result;
END;
$$;

-- Função para atualizar uma oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.api_update_oportunidade(
  p_id UUID,
  p_titulo TEXT DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_valor DECIMAL DEFAULT NULL,
  p_responsavel_id UUID DEFAULT NULL,
  p_prazo DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT NULL,
  p_tipo_faturamento TEXT DEFAULT NULL,
  p_data_reuniao DATE DEFAULT NULL,
  p_hora_reuniao TIME DEFAULT NULL
)
RETURNS crmonefactory.view_oportunidades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result crmonefactory.view_oportunidades;
BEGIN
  -- Atualizar a oportunidade
  UPDATE crmonefactory.oportunidades
  SET
    titulo = COALESCE(p_titulo, titulo),
    cliente_id = COALESCE(p_cliente_id, cliente_id),
    valor = COALESCE(p_valor, valor),
    responsavel_id = COALESCE(p_responsavel_id, responsavel_id),
    prazo = COALESCE(p_prazo, prazo),
    status = COALESCE(p_status, status),
    descricao = COALESCE(p_descricao, descricao),
    tipo = COALESCE(p_tipo, tipo),
    tipo_faturamento = COALESCE(p_tipo_faturamento, tipo_faturamento),
    data_reuniao = COALESCE(p_data_reuniao, data_reuniao),
    hora_reuniao = COALESCE(p_hora_reuniao, hora_reuniao),
    data_atualizacao = CURRENT_TIMESTAMP
  WHERE id = p_id;
  
  -- Retornar a oportunidade atualizada
  SELECT *
  INTO v_result
  FROM crmonefactory.view_oportunidades
  WHERE id = p_id;
  
  RETURN v_result;
END;
$$;

-- Função para atualizar o status de uma oportunidade (para Kanban)
CREATE OR REPLACE FUNCTION crmonefactory.api_update_oportunidade_status(
  p_id UUID,
  p_status TEXT,
  p_motivo_perda TEXT DEFAULT NULL
)
RETURNS crmonefactory.view_oportunidades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_oportunidade crmonefactory.oportunidades;
  v_result crmonefactory.view_oportunidades;
BEGIN
  -- Chamar a função existente para atualizar o status
  SELECT * INTO v_oportunidade
  FROM crmonefactory.atualizar_status_oportunidade(p_id, p_status, p_motivo_perda);
  
  -- Retornar os dados formatados para a view
  SELECT *
  INTO v_result
  FROM crmonefactory.view_oportunidades
  WHERE id = p_id;
  
  RETURN v_result;
END;
$$;

-- Função para excluir uma oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.api_delete_oportunidade(
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM crmonefactory.oportunidades
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- ======================================
-- FUNÇÕES DE API PARA CLIENTES
-- ======================================

-- Função para obter todos os clientes
CREATE OR REPLACE FUNCTION crmonefactory.api_get_clientes(
  p_termo TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL
)
RETURNS SETOF crmonefactory.clientes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.clientes
  WHERE
    (p_termo IS NULL OR 
      nome ILIKE '%' || p_termo || '%' OR 
      cnpj ILIKE '%' || p_termo || '%' OR 
      contato_nome ILIKE '%' || p_termo || '%')
    AND (p_ativo IS NULL OR ativo = p_ativo)
  ORDER BY nome;
END;
$$;

-- Função para obter um cliente por ID
CREATE OR REPLACE FUNCTION crmonefactory.api_get_cliente(
  p_id UUID
)
RETURNS crmonefactory.clientes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente crmonefactory.clientes;
BEGIN
  SELECT *
  INTO v_cliente
  FROM crmonefactory.clientes
  WHERE id = p_id;
  
  RETURN v_cliente;
END;
$$;

-- Função para criar um novo cliente
CREATE OR REPLACE FUNCTION crmonefactory.api_create_cliente(
  p_nome TEXT,
  p_cnpj TEXT,
  p_contato_nome TEXT DEFAULT NULL,
  p_contato_telefone TEXT DEFAULT NULL,
  p_contato_email TEXT DEFAULT NULL,
  p_endereco TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_segmento TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_faturamento TEXT DEFAULT NULL,
  p_responsavel_interno UUID DEFAULT NULL
)
RETURNS crmonefactory.clientes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_cliente crmonefactory.clientes;
BEGIN
  -- Inserir o novo cliente
  INSERT INTO crmonefactory.clientes (
    nome,
    cnpj,
    contato_nome,
    contato_telefone,
    contato_email,
    endereco,
    cidade,
    estado,
    segmento,
    data_cadastro,
    ativo,
    descricao,
    observacoes,
    faturamento,
    responsavel_interno,
    created_at,
    updated_at
  ) VALUES (
    p_nome,
    p_cnpj,
    p_contato_nome,
    p_contato_telefone,
    p_contato_email,
    p_endereco,
    p_cidade,
    p_estado,
    p_segmento,
    CURRENT_TIMESTAMP,
    TRUE,
    p_descricao,
    p_observacoes,
    p_faturamento,
    p_responsavel_interno,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_cliente_id;
  
  -- Retornar o cliente criado
  SELECT *
  INTO v_cliente
  FROM crmonefactory.clientes
  WHERE id = v_cliente_id;
  
  RETURN v_cliente;
END;
$$;

-- Função para atualizar um cliente
CREATE OR REPLACE FUNCTION crmonefactory.api_update_cliente(
  p_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL,
  p_contato_nome TEXT DEFAULT NULL,
  p_contato_telefone TEXT DEFAULT NULL,
  p_contato_email TEXT DEFAULT NULL,
  p_endereco TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_segmento TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_faturamento TEXT DEFAULT NULL,
  p_responsavel_interno UUID DEFAULT NULL
)
RETURNS crmonefactory.clientes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente crmonefactory.clientes;
BEGIN
  -- Atualizar o cliente
  UPDATE crmonefactory.clientes
  SET
    nome = COALESCE(p_nome, nome),
    cnpj = COALESCE(p_cnpj, cnpj),
    contato_nome = COALESCE(p_contato_nome, contato_nome),
    contato_telefone = COALESCE(p_contato_telefone, contato_telefone),
    contato_email = COALESCE(p_contato_email, contato_email),
    endereco = COALESCE(p_endereco, endereco),
    cidade = COALESCE(p_cidade, cidade),
    estado = COALESCE(p_estado, estado),
    segmento = COALESCE(p_segmento, segmento),
    ativo = COALESCE(p_ativo, ativo),
    descricao = COALESCE(p_descricao, descricao),
    observacoes = COALESCE(p_observacoes, observacoes),
    faturamento = COALESCE(p_faturamento, faturamento),
    responsavel_interno = COALESCE(p_responsavel_interno, responsavel_interno),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;
  
  -- Retornar o cliente atualizado
  SELECT *
  INTO v_cliente
  FROM crmonefactory.clientes
  WHERE id = p_id;
  
  RETURN v_cliente;
END;
$$;

-- Função para excluir um cliente
CREATE OR REPLACE FUNCTION crmonefactory.api_delete_cliente(
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM crmonefactory.clientes
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- ======================================
-- FUNÇÕES DE API PARA REUNIÕES
-- ======================================

-- Função para obter reuniões
CREATE OR REPLACE FUNCTION crmonefactory.api_get_reunioes(
  p_oportunidade_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_concluida BOOLEAN DEFAULT NULL
)
RETURNS SETOF crmonefactory.view_reunioes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.view_reunioes
  WHERE
    (p_oportunidade_id IS NULL OR oportunidade_id = p_oportunidade_id)
    AND (p_data_inicio IS NULL OR data >= p_data_inicio)
    AND (p_data_fim IS NULL OR data <= p_data_fim)
    AND (p_concluida IS NULL OR concluida = p_concluida)
  ORDER BY data, hora;
END;
$$;

-- Função para agendar uma nova reunião
CREATE OR REPLACE FUNCTION crmonefactory.api_agendar_reuniao(
  p_oportunidade_id UUID,
  p_titulo TEXT,
  p_data DATE,
  p_hora TIME,
  p_local TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_participantes UUID[] DEFAULT NULL
)
RETURNS crmonefactory.reunioes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reuniao_id UUID;
  v_reuniao crmonefactory.reunioes;
  v_participante UUID;
BEGIN
  -- Inserir a nova reunião
  INSERT INTO crmonefactory.reunioes (
    oportunidade_id,
    titulo,
    data,
    hora,
    local,
    notas,
    concluida,
    created_at,
    updated_at
  ) VALUES (
    p_oportunidade_id,
    p_titulo,
    p_data,
    p_hora,
    p_local,
    p_notas,
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_reuniao_id;
  
  -- Adicionar participantes
  IF p_participantes IS NOT NULL THEN
    FOREACH v_participante IN ARRAY p_participantes LOOP
      INSERT INTO crmonefactory.reunioes_participantes (
        reuniao_id,
        participante_id,
        tipo_participante,
        confirmado,
        created_at
      ) VALUES (
        v_reuniao_id,
        v_participante,
        'interno', -- assume-se que são usuários internos
        FALSE,
        CURRENT_TIMESTAMP
      );
    END LOOP;
  END IF;
  
  -- Atualizar a oportunidade para refletir a reunião agendada
  UPDATE crmonefactory.oportunidades
  SET
    status = CASE WHEN status = 'novo_lead' THEN 'agendamento_reuniao' ELSE status END,
    data_reuniao = p_data,
    hora_reuniao = p_hora,
    data_atualizacao = CURRENT_TIMESTAMP
  WHERE id = p_oportunidade_id;
  
  -- Retornar a reunião criada
  SELECT *
  INTO v_reuniao
  FROM crmonefactory.reunioes
  WHERE id = v_reuniao_id;
  
  RETURN v_reuniao;
END;
$$;

-- ======================================
-- FUNÇÕES DE API PARA NOTAS
-- ======================================

-- Função para obter notas de uma oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.api_get_notas_oportunidade(
  p_oportunidade_id UUID
)
RETURNS SETOF crmonefactory.notas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT n.*
  FROM crmonefactory.notas n
  WHERE n.oportunidade_id = p_oportunidade_id
  ORDER BY n.data DESC;
END;
$$;

-- Função para adicionar uma nota a uma oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.api_adicionar_nota(
  p_oportunidade_id UUID,
  p_autor_id UUID,
  p_texto TEXT,
  p_tipo TEXT DEFAULT 'geral'
)
RETURNS crmonefactory.notas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nota_id UUID;
  v_nota crmonefactory.notas;
BEGIN
  -- Inserir a nova nota
  INSERT INTO crmonefactory.notas (
    oportunidade_id,
    autor_id,
    texto,
    data,
    tipo
  ) VALUES (
    p_oportunidade_id,
    p_autor_id,
    p_texto,
    CURRENT_TIMESTAMP,
    p_tipo
  ) RETURNING id INTO v_nota_id;
  
  -- Atualizar timestamp da oportunidade
  UPDATE crmonefactory.oportunidades
  SET data_atualizacao = CURRENT_TIMESTAMP
  WHERE id = p_oportunidade_id;
  
  -- Retornar a nota criada
  SELECT *
  INTO v_nota
  FROM crmonefactory.notas
  WHERE id = v_nota_id;
  
  RETURN v_nota;
END;
$$;

-- ======================================
-- FUNÇÕES DE API PARA RESPONSÁVEIS
-- ======================================

-- Função para obter todos os responsáveis
CREATE OR REPLACE FUNCTION crmonefactory.api_get_responsaveis(
  p_termo TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT TRUE
)
RETURNS SETOF crmonefactory.responsaveis
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM crmonefactory.responsaveis
  WHERE
    (p_termo IS NULL OR 
      nome ILIKE '%' || p_termo || '%' OR 
      email ILIKE '%' || p_termo || '%' OR
      cargo ILIKE '%' || p_termo || '%')
    AND (p_ativo IS NULL OR ativo = p_ativo)
  ORDER BY nome;
END;
$$;

-- ======================================
-- FUNÇÕES DE API PARA ESTATÍSTICAS
-- ======================================

-- Função para obter estatísticas detalhadas do módulo comercial
CREATE OR REPLACE FUNCTION crmonefactory.api_get_estatisticas_comercial()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estatisticas JSON;
BEGIN
  SELECT json_build_object(
    'oportunidades', (
      SELECT json_build_object(
        'total', COUNT(*),
        'valor_total', COALESCE(SUM(valor), 0),
        'abertas', COUNT(*) FILTER (WHERE status NOT IN ('fechado_ganho', 'fechado_perdido')),
        'ganhas', COUNT(*) FILTER (WHERE status = 'fechado_ganho'),
        'perdidas', COUNT(*) FILTER (WHERE status = 'fechado_perdido'),
        'valor_ganho', COALESCE(SUM(valor) FILTER (WHERE status = 'fechado_ganho'), 0),
        'por_status', (
          SELECT json_object_agg(status, contagem)
          FROM (
            SELECT status, COUNT(*) as contagem
            FROM crmonefactory.oportunidades
            GROUP BY status
          ) as status_counts
        ),
        'por_tipo', (
          SELECT json_object_agg(tipo, contagem)
          FROM (
            SELECT tipo, COUNT(*) as contagem
            FROM crmonefactory.oportunidades
            GROUP BY tipo
          ) as tipo_counts
        )
      )
      FROM crmonefactory.oportunidades
    ),
    'clientes', (
      SELECT json_build_object(
        'total', COUNT(*),
        'ativos', COUNT(*) FILTER (WHERE ativo = TRUE),
        'inativos', COUNT(*) FILTER (WHERE ativo = FALSE),
        'por_segmento', (
          SELECT json_object_agg(segmento, contagem)
          FROM (
            SELECT segmento, COUNT(*) as contagem
            FROM crmonefactory.clientes
            GROUP BY segmento
          ) as segmento_counts
        )
      )
      FROM crmonefactory.clientes
    ),
    'reunioes', (
      SELECT json_build_object(
        'total', COUNT(*),
        'pendentes', COUNT(*) FILTER (WHERE concluida = FALSE),
        'concluidas', COUNT(*) FILTER (WHERE concluida = TRUE),
        'proximas', (
          SELECT COUNT(*)
          FROM crmonefactory.reunioes
          WHERE data >= CURRENT_DATE AND concluida = FALSE
        )
      )
      FROM crmonefactory.reunioes
    )
  ) INTO v_estatisticas;
  
  RETURN v_estatisticas;
END;
$$;

-- Concluir a transação
COMMIT;
