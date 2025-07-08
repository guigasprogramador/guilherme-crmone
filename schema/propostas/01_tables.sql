-- Script para criar tabelas do Módulo de Propostas
-- Assume que o schema crmonefactory já existe
-- Assume que as tabelas users, clientes, orgaos, oportunidades, licitacoes já existem

BEGIN;

-- Tabela de Propostas
CREATE TABLE IF NOT EXISTS crmonefactory.propostas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    numero_proposta VARCHAR(50) UNIQUE NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,
    status_proposta VARCHAR(50) NOT NULL DEFAULT 'EM_ELABORACAO', -- Ex: EM_ELABORACAO, ENVIADA, ACEITA, RECUSADA
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,

    cliente_id UUID REFERENCES crmonefactory.clientes(id) ON DELETE SET NULL,
    orgao_id UUID REFERENCES crmonefactory.orgaos(id) ON DELETE SET NULL,
    oportunidade_id UUID REFERENCES crmonefactory.oportunidades(id) ON DELETE SET NULL,
    licitacao_id UUID REFERENCES crmonefactory.licitacoes(id) ON DELETE SET NULL,

    responsavel_id UUID REFERENCES crmonefactory.users(id) ON DELETE SET NULL, -- Usuário interno responsável

    moeda VARCHAR(3) NOT NULL DEFAULT 'BRL',
    valor_total_itens DECIMAL(15,2) DEFAULT 0.00,
    percentual_desconto DECIMAL(5,2) DEFAULT 0.00,
    valor_desconto DECIMAL(15,2) DEFAULT 0.00,
    valor_subtotal_pos_desconto DECIMAL(15,2) DEFAULT 0.00,
    valor_impostos DECIMAL(15,2) DEFAULT 0.00,
    valor_total_proposta DECIMAL(15,2) DEFAULT 0.00,

    condicoes_pagamento TEXT,
    prazo_entrega_execucao TEXT,
    observacoes_internas TEXT,
    escopo_geral TEXT,

    data_envio_cliente TIMESTAMP WITH TIME ZONE,
    data_aprovacao_rejeicao TIMESTAMP WITH TIME ZONE,
    motivo_recusa_cancelamento TEXT,

    link_compartilhamento_externo TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cliente_or_orgao CHECK (cliente_id IS NOT NULL OR orgao_id IS NOT NULL)
);

-- Tabela de Itens da Proposta
CREATE TABLE IF NOT EXISTS crmonefactory.proposta_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposta_id UUID NOT NULL REFERENCES crmonefactory.propostas(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 0,

    tipo_item VARCHAR(100) NOT NULL,
    descricao_item TEXT NOT NULL,
    unidade_medida VARCHAR(50) NOT NULL DEFAULT 'Unidade',
    quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    -- Para PostgreSQL 12+ (subtotal_item DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,)
    -- Para MySQL (e outros SGBDs sem generated columns ou para compatibilidade):
    subtotal_item DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    observacoes_item TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar coluna proposta_id à tabela documentos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'crmonefactory'
        AND table_name = 'documentos'
        AND column_name = 'proposta_id'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN proposta_id UUID;
        RAISE NOTICE 'Coluna proposta_id adicionada à tabela documentos.';
    END IF;

    IF NOT EXISTS (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_schema = 'crmonefactory' AND table_name = 'documentos'
        AND constraint_name = 'fk_documentos_proposta_id'
    ) THEN
        ALTER TABLE crmonefactory.documentos
        ADD CONSTRAINT fk_documentos_proposta_id
        FOREIGN KEY (proposta_id)
        REFERENCES crmonefactory.propostas(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Constraint FK fk_documentos_proposta_id adicionada à tabela documentos.';
    ELSE
        RAISE NOTICE 'Constraint FK fk_documentos_proposta_id já existe na tabela documentos.';
    END IF;

END $$;


-- Índices
CREATE INDEX IF NOT EXISTS idx_propostas_status ON crmonefactory.propostas(status_proposta);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente_id ON crmonefactory.propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_orgao_id ON crmonefactory.propostas(orgao_id);
CREATE INDEX IF NOT EXISTS idx_propostas_oportunidade_id ON crmonefactory.propostas(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_propostas_licitacao_id ON crmonefactory.propostas(licitacao_id);
CREATE INDEX IF NOT EXISTS idx_propostas_responsavel_id ON crmonefactory.propostas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta_id ON crmonefactory.proposta_itens(proposta_id);
CREATE INDEX IF NOT EXISTS idx_documentos_proposta_id ON crmonefactory.documentos(proposta_id);

-- Triggers para timestamps (PostgreSQL)
CREATE OR REPLACE FUNCTION crmonefactory.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_propostas ON crmonefactory.propostas;
CREATE TRIGGER set_timestamp_propostas
BEFORE UPDATE ON crmonefactory.propostas
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_proposta_itens ON crmonefactory.proposta_itens;
CREATE TRIGGER set_timestamp_proposta_itens
BEFORE UPDATE ON crmonefactory.proposta_itens
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

COMMIT;
