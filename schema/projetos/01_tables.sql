-- Script para criar tabelas do Módulo de Projetos
-- Assume que o schema crmonefactory já existe
-- Assume que as tabelas users, clientes, orgaos, oportunidades, propostas, licitacoes já existem

BEGIN;

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS crmonefactory.projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_projeto VARCHAR(255) NOT NULL,
    codigo_projeto VARCHAR(50) UNIQUE,
    descricao TEXT,
    status_projeto VARCHAR(50) NOT NULL DEFAULT 'PLANEJAMENTO', -- PLANEJAMENTO, EM_ANDAMENTO, CONCLUIDO, EM_ESPERA, CANCELADO
    data_inicio_prevista DATE,
    data_fim_prevista DATE,
    data_inicio_real DATE,
    data_fim_real DATE,
    orcamento_horas DECIMAL(10,2),
    orcamento_custo DECIMAL(15,2),

    cliente_id UUID REFERENCES crmonefactory.clientes(id) ON DELETE SET NULL,
    orgao_id UUID REFERENCES crmonefactory.orgaos(id) ON DELETE SET NULL,

    oportunidade_id UUID REFERENCES crmonefactory.oportunidades(id) ON DELETE SET NULL,
    proposta_id UUID REFERENCES crmonefactory.propostas(id) ON DELETE SET NULL,
    licitacao_id UUID REFERENCES crmonefactory.licitacoes(id) ON DELETE SET NULL,

    gerente_projeto_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE RESTRICT,

    percentual_concluido INTEGER DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_projeto_entidade_alvo CHECK (cliente_id IS NOT NULL OR orgao_id IS NOT NULL)
);

-- Tabela de Tarefas do Projeto
CREATE TABLE IF NOT EXISTS crmonefactory.projeto_tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID NOT NULL REFERENCES crmonefactory.projetos(id) ON DELETE CASCADE,
    titulo_tarefa VARCHAR(255) NOT NULL,
    descricao_tarefa TEXT,
    status_tarefa VARCHAR(50) NOT NULL DEFAULT 'A_FAZER', -- A_FAZER, EM_PROGRESSO, CONCLUIDA, BLOQUEADA, CANCELADA
    responsavel_tarefa_id UUID REFERENCES crmonefactory.users(id) ON DELETE SET NULL,
    data_inicio_prevista_tarefa DATE,
    data_fim_prevista_tarefa DATE,
    data_conclusao_tarefa DATE,
    horas_estimadas DECIMAL(8,2),
    horas_realizadas DECIMAL(8,2) DEFAULT 0.00,
    prioridade INTEGER DEFAULT 3, -- 1-Alta, 2-Média, 3-Baixa
    depende_de_tarefa_id UUID REFERENCES crmonefactory.projeto_tarefas(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Equipe do Projeto (Membros)
CREATE TABLE IF NOT EXISTS crmonefactory.projeto_equipe (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID NOT NULL REFERENCES crmonefactory.projetos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE CASCADE,
    papel_no_projeto VARCHAR(100) NOT NULL,
    data_alocacao DATE DEFAULT CURRENT_DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (projeto_id, usuario_id)
);

-- Tabela de Apontamento de Horas
CREATE TABLE IF NOT EXISTS crmonefactory.apontamento_horas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarefa_id UUID NOT NULL REFERENCES crmonefactory.projeto_tarefas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES crmonefactory.users(id) ON DELETE RESTRICT,
    data_apontamento DATE NOT NULL,
    horas_gastas DECIMAL(6,2) NOT NULL CHECK (horas_gastas > 0),
    descricao_atividade TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar coluna projeto_id à tabela documentos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'crmonefactory'
        AND table_name = 'documentos'
        AND column_name = 'projeto_id'
    ) THEN
        ALTER TABLE crmonefactory.documentos ADD COLUMN projeto_id UUID;
        RAISE NOTICE 'Coluna projeto_id adicionada à tabela documentos.';
    END IF;

    IF NOT EXISTS (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_schema = 'crmonefactory' AND table_name = 'documentos'
        AND constraint_name = 'fk_documentos_projeto_id'
    ) THEN
        ALTER TABLE crmonefactory.documentos
        ADD CONSTRAINT fk_documentos_projeto_id
        FOREIGN KEY (projeto_id)
        REFERENCES crmonefactory.projetos(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Constraint FK fk_documentos_projeto_id adicionada à tabela documentos.';
    ELSE
        RAISE NOTICE 'Constraint FK fk_documentos_projeto_id já existe na tabela documentos.';
    END IF;

END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_projetos_status ON crmonefactory.projetos(status_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_id ON crmonefactory.projetos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_projetos_orgao_id ON crmonefactory.projetos(orgao_id);
CREATE INDEX IF NOT EXISTS idx_projetos_gerente_id ON crmonefactory.projetos(gerente_projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_tarefas_projeto_id ON crmonefactory.projeto_tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_tarefas_responsavel_id ON crmonefactory.projeto_tarefas(responsavel_tarefa_id);
CREATE INDEX IF NOT EXISTS idx_projeto_tarefas_status ON crmonefactory.projeto_tarefas(status_tarefa);
CREATE INDEX IF NOT EXISTS idx_projeto_equipe_projeto_id ON crmonefactory.projeto_equipe(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_equipe_usuario_id ON crmonefactory.projeto_equipe(usuario_id);
CREATE INDEX IF NOT EXISTS idx_apontamento_horas_tarefa_id ON crmonefactory.apontamento_horas(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_apontamento_horas_usuario_id ON crmonefactory.apontamento_horas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_projeto_id ON crmonefactory.documentos(projeto_id);

-- Triggers para timestamps (PostgreSQL)
-- (A função trigger_set_timestamp() já deve existir das etapas anteriores)
CREATE OR REPLACE FUNCTION crmonefactory.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_projetos ON crmonefactory.projetos;
CREATE TRIGGER set_timestamp_projetos
BEFORE UPDATE ON crmonefactory.projetos
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_projeto_tarefas ON crmonefactory.projeto_tarefas;
CREATE TRIGGER set_timestamp_projeto_tarefas
BEFORE UPDATE ON crmonefactory.projeto_tarefas
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_projeto_equipe ON crmonefactory.projeto_equipe;
CREATE TRIGGER set_timestamp_projeto_equipe
BEFORE UPDATE ON crmonefactory.projeto_equipe
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_apontamento_horas ON crmonefactory.apontamento_horas;
CREATE TRIGGER set_timestamp_apontamento_horas
BEFORE UPDATE ON crmonefactory.apontamento_horas
FOR EACH ROW
EXECUTE FUNCTION crmonefactory.trigger_set_timestamp();

COMMIT;
