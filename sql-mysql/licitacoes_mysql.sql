-- MySQL DDL for Licitacoes Module Tables

-- Table: orgaos (Government Entities)
CREATE TABLE IF NOT EXISTS orgaos (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  cnpj VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2), -- Assuming UF, e.g., SP, RJ
  segmento VARCHAR(100),
  origem_lead VARCHAR(100),
  responsavel_interno CHAR(36), -- FK to users table
  descricao TEXT,
  observacoes TEXT,
  faturamento VARCHAR(100), -- Consider a more structured type if used for calculations
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ativo TINYINT(1) DEFAULT 1,
  FOREIGN KEY (responsavel_interno) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_orgaos_cnpj ON orgaos(cnpj);
CREATE INDEX idx_orgaos_responsavel_interno ON orgaos(responsavel_interno);

-- Table: orgao_contatos (Contacts for Government Entities)
CREATE TABLE IF NOT EXISTS orgao_contatos (
  id CHAR(36) PRIMARY KEY,
  orgao_id CHAR(36) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orgao_id) REFERENCES orgaos(id) ON DELETE CASCADE
);
CREATE INDEX idx_orgao_contatos_orgao_id ON orgao_contatos(orgao_id);
CREATE INDEX idx_orgao_contatos_email ON orgao_contatos(email);

-- Table: licitacoes (Bids/Tenders)
CREATE TABLE IF NOT EXISTS licitacoes (
  id CHAR(36) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  orgao_id CHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'analise_interna',
  data_abertura TIMESTAMP NULL,
  data_publicacao TIMESTAMP NULL,
  data_julgamento TIMESTAMP NULL,
  valor_estimado DECIMAL(15, 2),
  valor_proposta DECIMAL(15, 2),
  modalidade VARCHAR(100) NOT NULL,
  numero_processo VARCHAR(100) NULL,
  objeto TEXT,
  edital VARCHAR(255), -- Path or identifier for the bid notice document
  numero_edital VARCHAR(100),
  responsavel_id CHAR(36), -- FK to users table (internal responsible user)
  prazo VARCHAR(100), -- Can be a specific date or description like "45 dias"
  url_licitacao TEXT, -- URL to the official bid page
  url_edital TEXT, -- Direct URL to the bid notice document
  descricao TEXT,
  forma_pagamento TEXT,
  obs_financeiras TEXT,
  tipo VARCHAR(20), -- 'produto' ou 'servico'
  tipo_faturamento VARCHAR(20), -- 'direto' ou 'distribuidor'
  margem_lucro DECIMAL(5, 2), -- Percentage, e.g., 15.50 for 15.50%
  contato_nome VARCHAR(255), -- External contact for this specific bid
  contato_email VARCHAR(255),
  contato_telefone VARCHAR(20),
  posicao_kanban INT DEFAULT 0,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orgao_id) REFERENCES orgaos(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_licitacoes_status ON licitacoes(status);
CREATE INDEX idx_licitacoes_orgao_id ON licitacoes(orgao_id);
CREATE INDEX idx_licitacoes_responsavel_id ON licitacoes(responsavel_id);
CREATE INDEX idx_licitacoes_data_abertura ON licitacoes(data_abertura);
CREATE INDEX idx_licitacoes_modalidade ON licitacoes(modalidade);

-- Table: licitacao_responsaveis (Many-to-many for multiple internal users responsible for a bid)
CREATE TABLE IF NOT EXISTS licitacao_responsaveis (
  id CHAR(36) PRIMARY KEY,
  licitacao_id CHAR(36) NOT NULL,
  usuario_id CHAR(36) NOT NULL, -- FK to users table
  papel VARCHAR(50), -- e.g., 'principal', 'suporte', 'financeiro'
  data_atribuicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_licitacao_usuario (licitacao_id, usuario_id)
);
CREATE INDEX idx_licitacao_responsaveis_licitacao_id ON licitacao_responsaveis(licitacao_id);
CREATE INDEX idx_licitacao_responsaveis_usuario_id ON licitacao_responsaveis(usuario_id);

-- Table: licitacao_etapas (Stages or phases of a bid process)
CREATE TABLE IF NOT EXISTS licitacao_etapas (
  id CHAR(36) PRIMARY KEY,
  licitacao_id CHAR(36) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  data_limite TIMESTAMP NULL, -- Deadline for this stage
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'concluida', 'atrasada'
  responsavel_id CHAR(36), -- FK to users table (internal user responsible for this stage)
  observacoes TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_conclusao TIMESTAMP NULL,
  FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_licitacao_etapas_licitacao_id ON licitacao_etapas(licitacao_id);
CREATE INDEX idx_licitacao_etapas_status ON licitacao_etapas(status);
CREATE INDEX idx_licitacao_etapas_responsavel_id ON licitacao_etapas(responsavel_id);

-- Table: licitacao_historico (History/log of changes for a bid)
CREATE TABLE IF NOT EXISTS licitacao_historico (
  id CHAR(36) PRIMARY KEY,
  licitacao_id CHAR(36) NOT NULL,
  usuario_id CHAR(36), -- FK to users table (user who made the change)
  acao VARCHAR(50) NOT NULL, -- 'criacao', 'alteracao', 'mudanca_status', etc.
  descricao TEXT, -- Description of the action
  dados_antigos JSON, -- Store previous state of relevant fields (MySQL JSON type)
  dados_novos JSON, -- Store new state of relevant fields (MySQL JSON type)
  data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_licitacao_historico_licitacao_id ON licitacao_historico(licitacao_id);
CREATE INDEX idx_licitacao_historico_usuario_id ON licitacao_historico(usuario_id);
CREATE INDEX idx_licitacao_historico_acao ON licitacao_historico(acao);

-- ======================================
-- NOTES ON RECONCILIATION AND ASSUMPTIONS
-- ======================================
-- 1. `usuarios` Table:
--    The `crmonefactory.usuarios` table defined in the source schema (`licitacoes/01_tables.sql`)
--    has been IGNORED. All Foreign Keys originally pointing to it now point to the
--    central `users` table (assumed to be named `users` and exist in the same database).
--    This includes:
--      - `orgaos.responsavel_interno` -> `users(id)`
--      - `licitacoes.responsavel_id` -> `users(id)`
--      - `licitacao_responsaveis.usuario_id` -> `users(id)`
--      - `licitacao_etapas.responsavel_id` -> `users(id)`
--      - `licitacao_historico.usuario_id` -> `users(id)`

-- 2. `documentos` Table:
--    The `crmonefactory.documentos` table defined in the source schema (`licitacoes/01_tables.sql`)
--    has been IGNORED. It is assumed that the canonical `documentos` table DDL from the
--    "Documentos Module" (generated in a previous step) will be used. That `documentos`
--    table should already include a `licitacao_id CHAR(36)` column, allowing documents
--    to be linked to licitacoes. No separate `documentos` table is created here.

-- 3. `documento_categorias` Table:
--    The `crmonefactory.documento_categorias` table defined in the source schema
--    (`licitacoes/01_tables.sql`) has been IGNORED. It is assumed that the `tags` and
--    `documentos_tags` tables from the "Documentos Module" DDL will be used for
--    categorizing/tagging documents.

-- 4. General DDL Transformations:
--    - `UUID` type changed to `CHAR(36)`. UUIDs are expected to be generated by the application.
--    - `TIMESTAMP WITH TIME ZONE` changed to `TIMESTAMP`.
--    - `DEFAULT uuid_generate_v4()` removed.
--    - `DEFAULT now()` changed to `DEFAULT CURRENT_TIMESTAMP`.
--    - `data_atualizacao` columns have `ON UPDATE CURRENT_TIMESTAMP` where appropriate.
--    - `JSONB` type changed to `JSON` for MySQL compatibility.
--    - Schema prefix `crmonefactory.` removed from all table names.
--    - `CREATE SCHEMA` statement removed.
--    - Indexes are created using MySQL syntax.

/*
-- Example of how to insert a licitacao in MySQL:
-- INSERT INTO licitacoes (id, titulo, orgao_id, modalidade, responsavel_id)
-- VALUES (UUID(), 'Nova Licitação de TI', 'orgao-uuid', 'Pregão Eletrônico', 'user-uuid');
*/
