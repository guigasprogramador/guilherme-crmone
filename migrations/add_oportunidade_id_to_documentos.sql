-- Migration: Add oportunidade_id field to documentos table
-- This migration adds support for linking documents to opportunities

-- Add the oportunidade_id column
ALTER TABLE documentos 
ADD COLUMN oportunidade_id CHAR(36) NULL AFTER licitacao_id;

-- Add foreign key constraint
ALTER TABLE documentos 
ADD CONSTRAINT fk_documentos_oportunidade 
FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_documentos_oportunidade ON documentos(oportunidade_id);

-- Update any existing documents that should be linked to opportunities
-- (This would need to be customized based on your specific data)
-- UPDATE documentos SET oportunidade_id = 'some-oportunidade-id' WHERE some_condition;