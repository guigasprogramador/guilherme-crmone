-- Script para criar e configurar o módulo comercial no schema crmonefactory
-- Executar este script no SQL Editor do Supabase

BEGIN;

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- TABELAS PRINCIPAIS
-- ======================================

-- Tabela de segmentos de clientes
CREATE TABLE IF NOT EXISTS crmonefactory.segmentos_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS crmonefactory.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) NOT NULL UNIQUE,
  contato_nome VARCHAR(255),
  contato_telefone VARCHAR(20),
  contato_email VARCHAR(255),
  endereco VARCHAR(255),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  segmento VARCHAR(100),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE,
  descricao TEXT,
  observacoes TEXT,
  faturamento VARCHAR(100),
  responsavel_interno UUID REFERENCES crmonefactory.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de contatos de clientes
CREATE TABLE IF NOT EXISTS crmonefactory.contatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES crmonefactory.clientes(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de responsáveis (funcionários internos)
CREATE TABLE IF NOT EXISTS crmonefactory.responsaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES crmonefactory.users(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de oportunidades
CREATE TABLE IF NOT EXISTS crmonefactory.oportunidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  cliente_id UUID REFERENCES crmonefactory.clientes(id) ON DELETE CASCADE,
  valor DECIMAL(15,2),
  responsavel_id UUID REFERENCES crmonefactory.responsaveis(id) ON DELETE SET NULL,
  prazo DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'novo_lead',
  descricao TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(50) DEFAULT 'produto', -- produto ou servico
  tipo_faturamento VARCHAR(50) DEFAULT 'direto', -- direto ou distribuidor
  data_reuniao DATE,
  hora_reuniao TIME,
  posicao_kanban INTEGER DEFAULT 0,
  motivo_perda TEXT,
  probabilidade INTEGER DEFAULT 50 -- porcentagem de 0 a 100
);

-- Tabela de responsáveis por oportunidade (para múltiplos responsáveis)
CREATE TABLE IF NOT EXISTS crmonefactory.oportunidades_responsaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oportunidade_id UUID REFERENCES crmonefactory.oportunidades(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES crmonefactory.responsaveis(id) ON DELETE CASCADE,
  papel VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de notas relacionadas às oportunidades
CREATE TABLE IF NOT EXISTS crmonefactory.notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oportunidade_id UUID REFERENCES crmonefactory.oportunidades(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES crmonefactory.users(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(50) DEFAULT 'geral' -- geral, reuniao, negociacao, etc.
);

-- Tabela de reuniões
CREATE TABLE IF NOT EXISTS crmonefactory.reunioes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oportunidade_id UUID REFERENCES crmonefactory.oportunidades(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local VARCHAR(255),
  notas TEXT,
  concluida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de participantes de reuniões
CREATE TABLE IF NOT EXISTS crmonefactory.reunioes_participantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reuniao_id UUID REFERENCES crmonefactory.reunioes(id) ON DELETE CASCADE,
  participante_id UUID, -- pode ser user_id ou contato_id
  tipo_participante VARCHAR(20) NOT NULL, -- interno ou externo
  confirmado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- VIEWS PARA SIMPLIFICAR QUERIES
-- ======================================

-- View para oportunidades com dados do cliente e responsável
CREATE OR REPLACE VIEW crmonefactory.view_oportunidades AS
SELECT 
  o.id,
  o.titulo,
  o.valor,
  o.prazo,
  o.status,
  o.descricao,
  o.data_criacao,
  o.data_atualizacao,
  o.tipo,
  o.tipo_faturamento,
  o.data_reuniao,
  o.hora_reuniao,
  o.posicao_kanban,
  o.probabilidade,
  o.motivo_perda,
  c.id AS cliente_id,
  c.nome AS cliente_nome,
  c.cnpj AS cliente_cnpj,
  c.contato_nome,
  c.contato_telefone,
  c.contato_email,
  c.segmento AS cliente_segmento,
  r.id AS responsavel_id,
  r.nome AS responsavel_nome,
  r.email AS responsavel_email
FROM 
  crmonefactory.oportunidades o
  JOIN crmonefactory.clientes c ON o.cliente_id = c.id
  LEFT JOIN crmonefactory.responsaveis r ON o.responsavel_id = r.id;

-- View para contatos dos clientes
CREATE OR REPLACE VIEW crmonefactory.view_cliente_contatos AS
SELECT 
  c.id AS cliente_id,
  c.nome AS cliente_nome,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.cargo,
  co.email,
  co.telefone,
  co.principal
FROM 
  crmonefactory.clientes c
  JOIN crmonefactory.contatos co ON c.id = co.cliente_id;

-- View para reuniões com dados da oportunidade
CREATE OR REPLACE VIEW crmonefactory.view_reunioes AS
SELECT 
  r.id,
  r.titulo,
  r.data,
  r.hora,
  r.local,
  r.notas,
  r.concluida,
  r.created_at,
  r.updated_at,
  o.id AS oportunidade_id,
  o.titulo AS oportunidade_titulo,
  c.id AS cliente_id,
  c.nome AS cliente_nome
FROM 
  crmonefactory.reunioes r
  JOIN crmonefactory.oportunidades o ON r.oportunidade_id = o.id
  JOIN crmonefactory.clientes c ON o.cliente_id = c.id;

-- ======================================
-- FUNÇÕES
-- ======================================

-- Função para atualizar o status de uma oportunidade
CREATE OR REPLACE FUNCTION crmonefactory.atualizar_status_oportunidade(
  oportunidade_id UUID,
  novo_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE crmonefactory.oportunidades
  SET 
    status = novo_status,
    data_atualizacao = NOW()
  WHERE id = oportunidade_id;
  
  RETURN FOUND;
END;
$$;

-- Garantir que a função pode ser chamada por usuários autenticados
GRANT EXECUTE ON FUNCTION crmonefactory.atualizar_status_oportunidade TO authenticated;
GRANT EXECUTE ON FUNCTION crmonefactory.atualizar_status_oportunidade TO anon;

-- ======================================
-- AJUSTES DE PERMISSÕES
-- ======================================

-- Garantir que o papel anon tenha acesso de leitura (para demo)
GRANT USAGE ON SCHEMA crmonefactory TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA crmonefactory TO anon;

-- Garantir que usuários autenticados tenham acesso completo
GRANT USAGE ON SCHEMA crmonefactory TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA crmonefactory TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA crmonefactory TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA crmonefactory TO authenticated;

-- Concluir a transação
COMMIT;
