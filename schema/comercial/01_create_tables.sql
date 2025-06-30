-- Criação das tabelas para o módulo comercial

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    contato_nome VARCHAR(255),
    contato_telefone VARCHAR(20),
    contato_email VARCHAR(255),
    endereco TEXT,
    segmento VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de responsáveis
CREATE TABLE IF NOT EXISTS responsaveis (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de oportunidades
CREATE TABLE IF NOT EXISTS oportunidades (
    id VARCHAR(36) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    cliente_id VARCHAR(36) NOT NULL,
    responsavel_id VARCHAR(36) NOT NULL,
    valor DECIMAL(15, 2),
    prazo DATE,
    status VARCHAR(50) NOT NULL,
    descricao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id)
);

-- Tabela de notas relacionadas às oportunidades
CREATE TABLE IF NOT EXISTS notas (
    id VARCHAR(36) PRIMARY KEY,
    oportunidade_id VARCHAR(36) NOT NULL,
    responsavel_id VARCHAR(36) NOT NULL,
    conteudo TEXT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id)
);

-- Tabela de reuniões relacionadas às oportunidades
CREATE TABLE IF NOT EXISTS reunioes (
    id VARCHAR(36) PRIMARY KEY,
    oportunidade_id VARCHAR(36) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_hora TIMESTAMP NOT NULL,
    local VARCHAR(255),
    participantes TEXT,
    concluida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE
);

-- Índices para melhorar a performance das consultas
CREATE INDEX idx_oportunidades_cliente_id ON oportunidades(cliente_id);
CREATE INDEX idx_oportunidades_responsavel_id ON oportunidades(responsavel_id);
CREATE INDEX idx_oportunidades_status ON oportunidades(status);
CREATE INDEX idx_notas_oportunidade_id ON notas(oportunidade_id);
CREATE INDEX idx_reunioes_oportunidade_id ON reunioes(oportunidade_id);
CREATE INDEX idx_clientes_ativo ON clientes(ativo);
CREATE INDEX idx_responsaveis_ativo ON responsaveis(ativo);
