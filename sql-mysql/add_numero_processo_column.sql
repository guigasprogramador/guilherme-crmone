-- Script para adicionar a coluna numero_processo à tabela licitacoes
-- Execute este script no seu banco de dados MySQL

ALTER TABLE licitacoes ADD COLUMN numero_processo VARCHAR(100) NULL AFTER modalidade;

-- Verificar se a coluna foi adicionada corretamente
DESCRIBE licitacoes;