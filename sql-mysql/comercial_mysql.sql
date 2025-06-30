-- MySQL DDL for Comercial Module Tables

-- Table: segmentos_clientes
CREATE TABLE IF NOT EXISTS segmentos_clientes (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) NOT NULL UNIQUE,
  contato_nome VARCHAR(255),
  contato_telefone VARCHAR(20),
  contato_email VARCHAR(255),
  endereco VARCHAR(255),
  cidade VARCHAR(100),
  estado VARCHAR(2), -- Assuming UF, e.g., SP, RJ
  segmento VARCHAR(100), -- Consider FK to segmentos_clientes.nome or id if it becomes a managed list
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Retained from original, could be same as created_at
  ativo TINYINT(1) DEFAULT 1,
  descricao TEXT,
  observacoes TEXT,
  faturamento VARCHAR(100), -- Consider a more structured type if used for calculations (e.g., DECIMAL)
  responsavel_interno CHAR(36), -- FK to users table
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_interno) REFERENCES users(id) ON DELETE SET NULL -- Or ON DELETE RESTRICT based on policy
);
CREATE INDEX idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX idx_clientes_responsavel_interno ON clientes(responsavel_interno);

-- Table: contatos
CREATE TABLE IF NOT EXISTS contatos (
  id CHAR(36) PRIMARY KEY,
  cliente_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  principal TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);
CREATE INDEX idx_contatos_cliente_id ON contatos(cliente_id);
CREATE INDEX idx_contatos_email ON contatos(email);

-- Table: responsaveis (Internal Employees/Users responsible for commercial activities)
-- This table seems to duplicate user information from the main `users` table.
-- Consider if this table is truly needed or if `users` table with specific roles/permissions is sufficient.
-- If kept, user_id should be UNIQUE to avoid multiple profiles for the same user.
CREATE TABLE IF NOT EXISTS responsaveis (
  id CHAR(36) PRIMARY KEY, -- This could be user_id itself if it's a 1-to-1 profile extension for commercial users
  user_id CHAR(36) UNIQUE, -- FK to users table, should be NOT NULL if this is a profile
  nome VARCHAR(255) NOT NULL, -- Can be sourced from users table
  email VARCHAR(255) NOT NULL, -- Can be sourced from users table
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  telefone VARCHAR(20), -- Can be sourced from a user_profiles table
  ativo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL -- Or CASCADE if this record is dependent
);
CREATE INDEX idx_responsaveis_user_id ON responsaveis(user_id);
CREATE INDEX idx_responsaveis_email ON responsaveis(email);

-- Table: oportunidades
CREATE TABLE IF NOT EXISTS oportunidades (
  id CHAR(36) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  cliente_id CHAR(36),
  valor DECIMAL(15,2),
  responsavel_id CHAR(36), -- FK to responsaveis.id (internal user/responsible for the opportunity)
  prazo DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'novo_lead',
  descricao TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Retained, could be same as created_at
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Retained, same as updated_at
  tipo VARCHAR(50) DEFAULT 'produto', -- e.g., produto ou servico
  tipo_faturamento VARCHAR(50) DEFAULT 'direto', -- e.g., direto ou distribuidor
  data_reuniao DATE,
  hora_reuniao TIME,
  posicao_kanban INT DEFAULT 0, -- Order in a Kanban board view
  motivo_perda TEXT,
  probabilidade INT DEFAULT 50, -- Percentage 0-100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added for consistency
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Added for consistency
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE SET NULL
);
CREATE INDEX idx_oportunidades_cliente_id ON oportunidades(cliente_id);
CREATE INDEX idx_oportunidades_responsavel_id ON oportunidades(responsavel_id);
CREATE INDEX idx_oportunidades_status ON oportunidades(status);

-- Table: oportunidades_responsaveis (Junction table for multiple internal users per opportunity)
CREATE TABLE IF NOT EXISTS oportunidades_responsaveis (
  id CHAR(36) PRIMARY KEY,
  oportunidade_id CHAR(36),
  responsavel_id CHAR(36), -- FK to responsaveis.id
  papel VARCHAR(100), -- Role of this responsible person in this specific opportunity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE CASCADE,
  UNIQUE KEY uq_oportunidade_responsavel (oportunidade_id, responsavel_id) -- Ensure a responsible is not added twice to the same opportunity
);
CREATE INDEX idx_oportunidades_responsaveis_oportunidade_id ON oportunidades_responsaveis(oportunidade_id);
CREATE INDEX idx_oportunidades_responsaveis_responsavel_id ON oportunidades_responsaveis(responsavel_id);

-- Table: notas (Notes related to opportunities)
CREATE TABLE IF NOT EXISTS notas (
  id CHAR(36) PRIMARY KEY,
  oportunidade_id CHAR(36),
  autor_id CHAR(36), -- FK to users table (the user who wrote the note)
  texto TEXT NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Could be named created_at
  tipo VARCHAR(50) DEFAULT 'geral', -- e.g., geral, reuniao, negociacao
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added for consistency
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Added for consistency
  FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_notas_oportunidade_id ON notas(oportunidade_id);
CREATE INDEX idx_notas_autor_id ON notas(autor_id);

-- Table: reunioes (Meetings related to opportunities)
CREATE TABLE IF NOT EXISTS reunioes (
  id CHAR(36) PRIMARY KEY,
  oportunidade_id CHAR(36),
  titulo VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local VARCHAR(255),
  notas TEXT,
  concluida TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_reunioes_oportunidade_id ON reunioes(oportunidade_id);
CREATE INDEX idx_reunioes_data ON reunioes(data);

-- Table: reunioes_participantes (Participants of meetings)
-- participante_id can refer to users.id (internal) or contatos.id (external client contact)
-- This requires careful handling in application logic or a more complex DB structure (e.g., a generic party model or separate tables for internal/external participants).
-- For simplicity, keeping as CHAR(36) and relying on tipo_participante.
CREATE TABLE IF NOT EXISTS reunioes_participantes (
  id CHAR(36) PRIMARY KEY,
  reuniao_id CHAR(36),
  participante_id CHAR(36), -- ID of the participant (from users or contatos table)
  tipo_participante VARCHAR(20) NOT NULL, -- e.g., 'interno' (users.id), 'externo' (contatos.id)
  confirmado TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE
  -- Cannot add direct FK to participante_id without knowing the source table.
  -- Application logic must validate based on tipo_participante.
  -- Or, use two nullable FK columns: user_id and contato_id.
);
CREATE INDEX idx_reunioes_participantes_reuniao_id ON reunioes_participantes(reuniao_id);
CREATE INDEX idx_reunioes_participantes_participante_id ON reunioes_participantes(participante_id);


-- ======================================
-- VIEWS
-- ======================================

-- View: view_oportunidades
CREATE OR REPLACE VIEW view_oportunidades AS
SELECT
  o.id,
  o.titulo,
  o.valor,
  o.prazo,
  o.status,
  o.descricao AS oportunidade_descricao, -- aliased to avoid conflict if joined with other tables having 'descricao'
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
  r.email AS responsavel_email,
  o.created_at,
  o.updated_at
FROM
  oportunidades o
  JOIN clientes c ON o.cliente_id = c.id
  LEFT JOIN responsaveis r ON o.responsavel_id = r.id;

-- View: view_cliente_contatos
CREATE OR REPLACE VIEW view_cliente_contatos AS
SELECT
  c.id AS cliente_id,
  c.nome AS cliente_nome,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.cargo,
  co.email AS contato_email, -- aliased
  co.telefone AS contato_telefone, -- aliased
  co.principal AS contato_principal -- aliased
FROM
  clientes c
  JOIN contatos co ON c.id = co.cliente_id;

-- View: view_reunioes
CREATE OR REPLACE VIEW view_reunioes AS
SELECT
  r.id AS reuniao_id, -- aliased
  r.titulo AS reuniao_titulo, -- aliased
  r.data AS reuniao_data, -- aliased
  r.hora AS reuniao_hora, -- aliased
  r.local AS reuniao_local, -- aliased
  r.notas AS reuniao_notas, -- aliased
  r.concluida AS reuniao_concluida, -- aliased
  r.created_at AS reuniao_created_at, -- aliased
  r.updated_at AS reuniao_updated_at, -- aliased
  o.id AS oportunidade_id,
  o.titulo AS oportunidade_titulo,
  c.id AS cliente_id,
  c.nome AS cliente_nome
FROM
  reunioes r
  JOIN oportunidades o ON r.oportunidade_id = o.id
  JOIN clientes c ON o.cliente_id = c.id;

-- ======================================
-- NOTES ON FUNCTIONS AND PROCEDURES
-- ======================================

-- The following PostgreSQL function needs manual conversion to a MySQL Stored Procedure:
--
-- CREATE OR REPLACE FUNCTION crmonefactory.atualizar_status_oportunidade(
--   oportunidade_id UUID,
--   novo_status TEXT
-- )
-- RETURNS BOOLEAN
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   UPDATE crmonefactory.oportunidades
--   SET
--     status = novo_status,
--     data_atualizacao = NOW() -- In MySQL, this would be CURRENT_TIMESTAMP
--   WHERE id = oportunidade_id;
--
--   RETURN FOUND; -- MySQL does not have a direct `FOUND` equivalent in the same way for return.
--                 -- ROW_COUNT() can be checked. A procedure might not return a boolean directly,
--                 -- or it could use an OUT parameter.
-- END;
-- $$;
--
-- Example structure for MySQL procedure (conceptual):
--
-- DELIMITER //
-- CREATE PROCEDURE atualizar_status_oportunidade(
--   IN p_oportunidade_id CHAR(36),
--   IN p_novo_status VARCHAR(255),
--   OUT p_success TINYINT(1)
-- )
-- BEGIN
--   DECLARE row_count_val INT;
--   UPDATE oportunidades
--   SET
--     status = p_novo_status,
--     data_atualizacao = CURRENT_TIMESTAMP, -- or updated_at = CURRENT_TIMESTAMP if that's the column being used
--     updated_at = CURRENT_TIMESTAMP
--   WHERE id = p_oportunidade_id;
--
--   SET row_count_val = ROW_COUNT();
--   IF row_count_val > 0 THEN
--     SET p_success = 1;
--   ELSE
--     SET p_success = 0;
--   END IF;
-- END //
-- DELIMITER ;

-- ======================================
-- Additional Notes:
-- ======================================
-- 1. `uuid-ossp` extension is PostgreSQL specific and not used. UUIDs are CHAR(36) and expected to be application-generated.
-- 2. Schema prefix `crmonefactory.` has been removed. Assumes connection to the correct database.
-- 3. `BEGIN;` and `COMMIT;` removed.
-- 4. `GRANT` statements omitted.
-- 5. `created_at` and `updated_at` columns:
--    - Added `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` where it was missing for consistency.
--    - Ensured `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` for tables that had it.
--    - Some tables in the source had `data_criacao` and `data_atualizacao`. I've kept these but also added standard `created_at`/`updated_at` for ORM compatibility and consistency.
--      If `data_criacao` is meant to be `created_at`, it can be aliased or consolidated. Similarly for `data_atualizacao`.
-- 6. `clientes.segmento`: Currently VARCHAR. If `segmentos_clientes` table is the definitive source, this could be a FK.
-- 7. `clientes.faturamento`: Currently VARCHAR. If this is a monetary value, DECIMAL or INT might be better.
-- 8. `responsaveis` table: Added a note about its potential redundancy with the main `users` table. If it acts as a specific "commercial profile" for users, then `user_id` should ideally be `NOT NULL` and `UNIQUE`.
-- 9. `reunioes_participantes.participante_id`: Noted the challenge of a polymorphic FK. Application logic will need to manage this, or the table structure could be changed (e.g. two nullable FKs, one to `users` and one to `contatos`).
-- 10. Indexes: Added some basic indexes for foreign keys and commonly queried columns. More specific indexing strategies might be needed based on query patterns.
-- 11. View column name aliasing: Added aliases in views where column names might conflict (e.g., `descricao`, `email`, `telefone`, `id`, `titulo`, `data`, `hora`, `local`, `notas`, `concluida`, `created_at`, `updated_at`) to make them unique when selecting from the view.
-- 12. `oportunidades.responsavel_id` links to `responsaveis(id)`. This seems correct based on the schema.
-- 13. `oportunidades_responsaveis` also links to `responsaveis(id)`.

/*
-- Example of how to insert a UUID in MySQL 8.0+ if needed (or generate in app):
-- INSERT INTO clientes (id, nome, cnpj, responsavel_interno)
-- VALUES (UUID(), 'Test Cliente', '00.000.000/0001-00', 'user-uuid-from-users-table');
*/
