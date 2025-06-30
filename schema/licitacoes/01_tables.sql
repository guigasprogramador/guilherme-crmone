-- Schema para o módulo de licitações
-- Usar o schema crmonefactory existente

-- Verificar se o schema existe, caso não, criar
CREATE SCHEMA IF NOT EXISTS crmonefactory;

-- Criar tabela de usuários se não existir (necessária para as foreign keys)
CREATE TABLE IF NOT EXISTS crmonefactory.usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255),
  ativo BOOLEAN DEFAULT TRUE,
  role VARCHAR(50) DEFAULT 'user',
  avatar_url TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Órgãos (entidades governamentais)
CREATE TABLE IF NOT EXISTS crmonefactory.orgaos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  cnpj VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  segmento VARCHAR(100),
  origem_lead VARCHAR(100),
  responsavel_interno UUID,
  descricao TEXT,
  observacoes TEXT,
  faturamento VARCHAR(100),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ativo BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (responsavel_interno) REFERENCES crmonefactory.usuarios(id) ON DELETE SET NULL
);

-- Tabela de Contatos de Órgãos
CREATE TABLE IF NOT EXISTS crmonefactory.orgao_contatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orgao_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (orgao_id) REFERENCES crmonefactory.orgaos(id) ON DELETE CASCADE
);

-- Tabela de Categorias de Documentos
CREATE TABLE IF NOT EXISTS crmonefactory.documento_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(20),
  icone VARCHAR(100),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Licitações
CREATE TABLE IF NOT EXISTS crmonefactory.licitacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  orgao_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'analise_interna',
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_publicacao TIMESTAMP WITH TIME ZONE,
  data_julgamento TIMESTAMP WITH TIME ZONE,
  valor_estimado DECIMAL(15, 2),
  valor_proposta DECIMAL(15, 2),
  modalidade VARCHAR(100) NOT NULL,
  objeto TEXT,
  edital VARCHAR(255),
  numero_edital VARCHAR(100),
  responsavel_id UUID,
  prazo VARCHAR(100),
  url_licitacao TEXT,
  url_edital TEXT,
  descricao TEXT,
  forma_pagamento TEXT,
  obs_financeiras TEXT,
  tipo VARCHAR(20), -- 'produto' ou 'servico'
  tipo_faturamento VARCHAR(20), -- 'direto' ou 'distribuidor'
  margem_lucro DECIMAL(5, 2),
  contato_nome VARCHAR(255),
  contato_email VARCHAR(255),
  contato_telefone VARCHAR(20),
  posicao_kanban INTEGER DEFAULT 0,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (orgao_id) REFERENCES crmonefactory.orgaos(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES crmonefactory.usuarios(id) ON DELETE SET NULL
);

-- Tabela de Responsáveis por Licitação (N para N)
CREATE TABLE IF NOT EXISTS crmonefactory.licitacao_responsaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacao_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  papel VARCHAR(50), -- ex: 'principal', 'suporte', 'financeiro'
  data_atribuicao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES crmonefactory.usuarios(id) ON DELETE CASCADE,
  
  UNIQUE(licitacao_id, usuario_id)
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS crmonefactory.documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  arquivo TEXT,
  tipo VARCHAR(50),
  tamanho BIGINT,
  licitacao_id UUID,
  formato VARCHAR(20),
  categoria_id UUID,
  upload_por UUID,
  resumo TEXT,
  data_validade TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'ativo',
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES crmonefactory.documento_categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (upload_por) REFERENCES crmonefactory.usuarios(id) ON DELETE SET NULL
);

-- Tabela para acompanhamento de etapas da licitação
CREATE TABLE IF NOT EXISTS crmonefactory.licitacao_etapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacao_id UUID NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  data_limite TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'concluida', 'atrasada'
  responsavel_id UUID,
  observacoes TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_conclusao TIMESTAMP WITH TIME ZONE,
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES crmonefactory.usuarios(id) ON DELETE SET NULL
);

-- Tabela para histórico de alterações
CREATE TABLE IF NOT EXISTS crmonefactory.licitacao_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacao_id UUID NOT NULL,
  usuario_id UUID,
  acao VARCHAR(50) NOT NULL, -- 'criacao', 'alteracao', 'mudanca_status', etc.
  descricao TEXT,
  dados_antigos JSONB,
  dados_novos JSONB,
  data_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  FOREIGN KEY (licitacao_id) REFERENCES crmonefactory.licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES crmonefactory.usuarios(id) ON DELETE SET NULL
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_licitacoes_status ON crmonefactory.licitacoes(status);
CREATE INDEX IF NOT EXISTS idx_licitacoes_orgao_id ON crmonefactory.licitacoes(orgao_id);
CREATE INDEX IF NOT EXISTS idx_licitacoes_responsavel_id ON crmonefactory.licitacoes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_licitacoes_data_abertura ON crmonefactory.licitacoes(data_abertura);
CREATE INDEX IF NOT EXISTS idx_documentos_licitacao_id ON crmonefactory.documentos(licitacao_id);
CREATE INDEX IF NOT EXISTS idx_orgao_contatos_orgao_id ON crmonefactory.orgao_contatos(orgao_id);
