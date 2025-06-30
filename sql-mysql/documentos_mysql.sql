-- MySQL DDL for Documentos Module Tables

-- Table: documentos
CREATE TABLE IF NOT EXISTS documentos (
  id CHAR(36) PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- Type of the document, e.g., 'contrato', 'edital'
  -- The `categorias text[]` column from PostgreSQL is replaced by the tags & documentos_tags tables.
  categoria TEXT NULL, -- Legacy single category field, kept for compatibility
  descricao TEXT,
  licitacao_id CHAR(36), -- FK to licitacoes table
  numero_documento TEXT,
  data_validade TIMESTAMP NULL, -- Nullable, as not all documents might have an expiry date
  url_documento TEXT, -- URL if stored externally
  arquivo_path TEXT, -- Path if stored in a local/shared filesystem
  formato TEXT, -- e.g., 'pdf', 'docx'
  tamanho BIGINT, -- Size in bytes
  status TEXT NOT NULL DEFAULT 'ativo', -- e.g., 'ativo', 'arquivado', 'excluido'
  criado_por CHAR(36), -- FK to users table
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE SET NULL, -- Assuming licitacoes table exists
  FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL -- Assuming users table exists
);

-- Indexes for documentos table
CREATE INDEX idx_documentos_licitacao ON documentos(licitacao_id);
CREATE INDEX idx_documentos_status ON documentos(status);
CREATE INDEX idx_documentos_tipo ON documentos(tipo(255)); -- Prefix for TEXT column indexing
CREATE INDEX idx_documentos_criado_por ON documentos(criado_por);
CREATE INDEX idx_documentos_data_criacao ON documentos(data_criacao);

-- Table: tags (replaces the array `categorias`)
CREATE TABLE IF NOT EXISTS tags (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: documentos_tags (join table for many-to-many relationship between documentos and tags)
CREATE TABLE IF NOT EXISTS documentos_tags (
  documento_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  PRIMARY KEY (documento_id, tag_id),
  FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE INDEX idx_documentos_tags_documento_id ON documentos_tags(documento_id);
CREATE INDEX idx_documentos_tags_tag_id ON documentos_tags(tag_id);

-- ======================================
-- NOTES ON FUNCTIONS AND TRIGGERS
-- ======================================

-- 1. Trigger `documentos_atualizar_timestamp`:
--    The PostgreSQL trigger function `crmonefactory.documentos_atualizar_timestamp`
--    is replaced by MySQL's native `ON UPDATE CURRENT_TIMESTAMP` feature for the
--    `data_atualizacao` column in the `documentos` table.

-- 2. PostgreSQL Functions for Category Search:
--    The following PostgreSQL functions need to be re-implemented using SQL JOINs
--    with the new `tags` and `documentos_tags` tables in MySQL:
--
--    - `crmonefactory.documentos_por_categoria(categoria_busca text)`
--      -- MySQL equivalent:
--      -- SELECT d.* FROM documentos d
--      -- JOIN documentos_tags dt ON d.id = dt.documento_id
--      -- JOIN tags t ON dt.tag_id = t.id
--      -- WHERE t.nome = 'categoria_busca' AND d.status != 'excluido';
--
--    - `crmonefactory.documentos_com_qualquer_categoria(categorias_busca text[])`
--      -- MySQL equivalent (assuming 'categorias_busca' is a list of tag names):
--      -- SELECT DISTINCT d.* FROM documentos d
--      -- JOIN documentos_tags dt ON d.id = dt.documento_id
--      -- JOIN tags t ON dt.tag_id = t.id
--      -- WHERE t.nome IN ('cat1', 'cat2', ...) AND d.status != 'excluido';
--
--    - `crmonefactory.documentos_com_todas_categorias(categorias_busca text[])`
--      -- MySQL equivalent (assuming 'categorias_busca' is a list of tag names and count_of_categories is known):
--      -- SELECT d.* FROM documentos d
--      -- JOIN documentos_tags dt ON d.id = dt.documento_id
--      -- JOIN tags t ON dt.tag_id = t.id
--      -- WHERE t.nome IN ('cat1', 'cat2', ...) AND d.status != 'excluido'
--      -- GROUP BY d.id
--      -- HAVING COUNT(DISTINCT t.nome) = count_of_categories;

-- ======================================
-- Additional Notes:
-- ======================================
-- 1. UUIDs: `CHAR(36)` is used. Application is responsible for generating UUIDs.
-- 2. Timestamps: `TIMESTAMPTZ` converted to `TIMESTAMP`.
-- 3. Schema Prefix: `crmonefactory.` removed.
-- 4. RLS Policies: Ignored for DDL.
-- 5. `categorias text[]`: This PostgreSQL array column is handled by the new `tags` and `documentos_tags` tables.
--    The legacy `categoria TEXT NULL` column has been retained in the `documentos` table for compatibility if needed during a phased migration.
--    Data from `categoria` or `categorias[]` would need to be migrated to the new `tags` structure manually or via script.
-- 6. Foreign Key `criado_por`: Points to `users(id)`. Assumes `users` table exists.
-- 7. Foreign Key `licitacao_id`: Points to `licitacoes(id)`. Assumes `licitacoes` table exists. If not, this FK should be removed or the `licitacoes` table DDL created.
-- 8. Indexing on `TEXT` columns (`tipo`): A prefix length (e.g., 255) is specified as MySQL may require this for indexing `TEXT` or `BLOB` columns.
-- 9. The GIN index `idx_documentos_categorias ON crmonefactory.documentos USING GIN (categorias)` is specific to PostgreSQL arrays and is replaced by standard B-tree indexes on the `documentos_tags` join table.
-- 10. `auth.users(id)` reference for `criado_por` in the source schema has been interpreted as the main `users` table.
-- 11. Default for `data_criacao` and `data_atualizacao` are set to `CURRENT_TIMESTAMP`. `data_atualizacao` also has `ON UPDATE CURRENT_TIMESTAMP`.
-- 12. `status` column in `documentos` is kept as `TEXT`. Consider `VARCHAR(50)` or an `ENUM` if the possible values are well-defined and limited.
-- 13. `tipo` column in `documentos` is kept as `TEXT`. Similar to `status`, `VARCHAR(100)` or `ENUM` could be alternatives.

/*
-- Example of how to insert a document and associate tags in MySQL:
-- -- 1. Insert the document:
-- INSERT INTO documentos (id, nome, tipo, criado_por, licitacao_id)
-- VALUES (UUID(), 'Contrato XPTO', 'Contrato', 'user-uuid', 'licitacao-uuid');
-- SET @last_doc_id = LAST_INSERT_ID(); -- If using auto-increment ID, or get the UUID generated by app.

-- -- 2. Ensure tags exist or create them:
-- INSERT IGNORE INTO tags (id, nome) VALUES (UUID(), 'juridico');
-- SET @tag_juridico_id = (SELECT id FROM tags WHERE nome = 'juridico');
-- INSERT IGNORE INTO tags (id, nome) VALUES (UUID(), 'licitacao_xyz');
-- SET @tag_licitacao_id = (SELECT id FROM tags WHERE nome = 'licitacao_xyz');

-- -- 3. Associate document with tags:
-- INSERT INTO documentos_tags (documento_id, tag_id) VALUES (@last_doc_id, @tag_juridico_id);
-- INSERT INTO documentos_tags (documento_id, tag_id) VALUES (@last_doc_id, @tag_licitacao_id);
*/
