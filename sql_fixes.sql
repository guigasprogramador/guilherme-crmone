-- Correções no banco de dados do CRM

-- 1. Corrigir tipo de dados da coluna oportunidade_id na tabela documentos
-- Atualmente está como varchar(255), deveria ser char(36) para consistência com outras chaves
ALTER TABLE documentos MODIFY COLUMN oportunidade_id char(36);

-- 2. Adicionar índices para melhorar performance
CREATE INDEX idx_documentos_oportunidade_id ON documentos(oportunidade_id);
CREATE INDEX idx_documentos_licitacao_id ON documentos(licitacao_id);
CREATE INDEX idx_documentos_tags_documento_id ON documentos_tags(documento_id);
CREATE INDEX idx_documentos_tags_tag_id ON documentos_tags(tag_id);

-- 3. Adicionar chaves estrangeiras para garantir integridade referencial
ALTER TABLE documentos 
ADD CONSTRAINT fk_documentos_oportunidade 
FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE SET NULL;

ALTER TABLE documentos 
ADD CONSTRAINT fk_documentos_licitacao 
FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE SET NULL;

ALTER TABLE documentos_tags 
ADD CONSTRAINT fk_documentos_tags_documento 
FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE;

ALTER TABLE documentos_tags 
ADD CONSTRAINT fk_documentos_tags_tag 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- 4. Corrigir campos de timestamp duplicados na tabela licitacoes
-- Remover campo updated_at duplicado (existe data_atualizacao)
ALTER TABLE licitacoes DROP COLUMN updated_at;

-- 5. Adicionar índices para campos frequentemente consultados
CREATE INDEX idx_oportunidades_status ON oportunidades(status);
CREATE INDEX idx_oportunidades_cliente_id ON oportunidades(cliente_id);
CREATE INDEX idx_oportunidades_responsavel_id ON oportunidades(responsavel_id);
CREATE INDEX idx_licitacoes_status ON licitacoes(status);
CREATE INDEX idx_licitacoes_orgao_id ON licitacoes(orgao_id);
CREATE INDEX idx_licitacoes_responsavel_id ON licitacoes(responsavel_id);

-- 6. Melhorar view de oportunidades para incluir contagem de documentos
CREATE OR REPLACE VIEW view_oportunidades_completa AS
SELECT 
    o.*,
    c.nome as cliente_nome,
    c.cnpj as cliente_cnpj,
    c.contato_nome,
    c.contato_telefone,
    c.contato_email,
    c.segmento as cliente_segmento,
    r.nome as responsavel_nome,
    r.email as responsavel_email,
    COUNT(d.id) as total_documentos
FROM oportunidades o
LEFT JOIN clientes c ON o.cliente_id = c.id
LEFT JOIN responsaveis r ON o.responsavel_id = r.id
LEFT JOIN documentos d ON o.id = d.oportunidade_id
GROUP BY o.id, c.id, r.id;

-- 7. Criar view para documentos com tags
CREATE OR REPLACE VIEW view_documentos_tags AS
SELECT 
    d.id,
    d.nome,
    d.tipo,
    d.categoria,
    d.descricao,
    d.licitacao_id,
    d.oportunidade_id,
    d.numero_documento,
    d.data_validade,
    d.url_documento,
    d.arquivo_path,
    d.formato,
    d.tamanho,
    d.status,
    d.criado_por,
    d.data_criacao,
    d.data_atualizacao,
    GROUP_CONCAT(t.nome SEPARATOR ', ') as tags,
    l.titulo as licitacao_titulo,
    o.titulo as oportunidade_titulo,
    u.name as criado_por_nome
FROM documentos d
LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
LEFT JOIN tags t ON dt.tag_id = t.id
LEFT JOIN licitacoes l ON d.licitacao_id = l.id
LEFT JOIN oportunidades o ON d.oportunidade_id = o.id
LEFT JOIN users u ON d.criado_por = u.id
GROUP BY d.id;



-- 8. Correções adicionais identificadas na revisão dos CRUDS

-- 8.1. Adicionar validação para evitar duplicação de CNPJ em clientes
-- (Já existe UNIQUE constraint, mas vamos garantir que está ativo)
-- ALTER TABLE clientes ADD CONSTRAINT uk_clientes_cnpj UNIQUE (cnpj);

-- 8.2. Adicionar validação para evitar duplicação de email em contatos
-- ALTER TABLE contatos ADD CONSTRAINT uk_contatos_email UNIQUE (email);

-- 8.3. Melhorar índices para consultas frequentes
CREATE INDEX idx_oportunidades_data_criacao ON oportunidades(data_criacao);
CREATE INDEX idx_licitacoes_data_criacao ON licitacoes(data_criacao);
CREATE INDEX idx_documentos_data_criacao ON documentos(data_criacao);

-- 8.4. Adicionar constraint para garantir que apenas um contato principal por cliente
-- Primeiro, vamos criar um índice único condicional (MySQL 8.0+)
-- CREATE UNIQUE INDEX uk_contatos_principal_cliente ON contatos(cliente_id) WHERE principal = 1;

-- Para versões anteriores do MySQL, podemos usar um trigger
DELIMITER $$
CREATE TRIGGER tr_contatos_principal_unico
BEFORE INSERT ON contatos
FOR EACH ROW
BEGIN
    IF NEW.principal = 1 THEN
        UPDATE contatos SET principal = 0 WHERE cliente_id = NEW.cliente_id AND principal = 1;
    END IF;
END$$

CREATE TRIGGER tr_contatos_principal_unico_update
BEFORE UPDATE ON contatos
FOR EACH ROW
BEGIN
    IF NEW.principal = 1 AND OLD.principal != 1 THEN
        UPDATE contatos SET principal = 0 WHERE cliente_id = NEW.cliente_id AND principal = 1 AND id != NEW.id;
    END IF;
END$$
DELIMITER ;

-- 8.5. Adicionar campos de auditoria em tabelas importantes
ALTER TABLE clientes ADD COLUMN created_by char(36) NULL;
ALTER TABLE clientes ADD COLUMN updated_by char(36) NULL;
ALTER TABLE oportunidades ADD COLUMN created_by char(36) NULL;
ALTER TABLE oportunidades ADD COLUMN updated_by char(36) NULL;
ALTER TABLE licitacoes ADD COLUMN created_by char(36) NULL;
ALTER TABLE licitacoes ADD COLUMN updated_by char(36) NULL;

-- 8.6. Adicionar chaves estrangeiras para os campos de auditoria
ALTER TABLE clientes ADD CONSTRAINT fk_clientes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clientes ADD CONSTRAINT fk_clientes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE oportunidades ADD CONSTRAINT fk_oportunidades_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE oportunidades ADD CONSTRAINT fk_oportunidades_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE licitacoes ADD CONSTRAINT fk_licitacoes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE licitacoes ADD CONSTRAINT fk_licitacoes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 8.7. Criar view para estatísticas do sistema
CREATE OR REPLACE VIEW view_estatisticas_sistema AS
SELECT 
    (SELECT COUNT(*) FROM clientes WHERE ativo = 1) as total_clientes_ativos,
    (SELECT COUNT(*) FROM oportunidades) as total_oportunidades,
    (SELECT COUNT(*) FROM oportunidades WHERE status = 'ganho') as oportunidades_ganhas,
    (SELECT COUNT(*) FROM licitacoes) as total_licitacoes,
    (SELECT COUNT(*) FROM licitacoes WHERE status = 'homologada') as licitacoes_homologadas,
    (SELECT COUNT(*) FROM documentos) as total_documentos,
    (SELECT SUM(valor) FROM oportunidades WHERE status = 'ganho') as valor_total_oportunidades_ganhas,
    (SELECT SUM(valor_homologado) FROM licitacoes WHERE status = 'homologada') as valor_total_licitacoes_homologadas;

-- 8.8. Criar procedimento para limpeza de dados órfãos
DELIMITER $$
CREATE PROCEDURE sp_limpeza_dados_orfaos()
BEGIN
    -- Remover documentos_tags órfãos
    DELETE dt FROM documentos_tags dt
    LEFT JOIN documentos d ON dt.documento_id = d.id
    WHERE d.id IS NULL;
    
    -- Remover documentos_tags com tags inexistentes
    DELETE dt FROM documentos_tags dt
    LEFT JOIN tags t ON dt.tag_id = t.id
    WHERE t.id IS NULL;
    
    -- Remover contatos órfãos (sem cliente)
    DELETE c FROM contatos c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    WHERE cl.id IS NULL;
    
    -- Remover oportunidades_responsaveis órfãos
    DELETE or_table FROM oportunidades_responsaveis or_table
    LEFT JOIN oportunidades o ON or_table.oportunidade_id = o.id
    WHERE o.id IS NULL;
    
    -- Remover licitacao_responsaveis órfãos
    DELETE lr FROM licitacao_responsaveis lr
    LEFT JOIN licitacoes l ON lr.licitacao_id = l.id
    WHERE l.id IS NULL;
END$$
DELIMITER ;

-- 8.9. Criar função para validar CNPJ
DELIMITER $$
CREATE FUNCTION fn_validar_cnpj(cnpj VARCHAR(20)) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE cnpj_limpo VARCHAR(14);
    DECLARE i INT DEFAULT 1;
    DECLARE soma INT DEFAULT 0;
    DECLARE resto INT;
    DECLARE digito1 INT;
    DECLARE digito2 INT;
    
    -- Remove caracteres não numéricos
    SET cnpj_limpo = REGEXP_REPLACE(cnpj, '[^0-9]', '');
    
    -- Verifica se tem 14 dígitos
    IF LENGTH(cnpj_limpo) != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se todos os dígitos são iguais
    IF cnpj_limpo REGEXP '^(.)\\1{13}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Calcula primeiro dígito verificador
    SET soma = 0;
    SET i = 1;
    WHILE i <= 12 DO
        SET soma = soma + (CAST(SUBSTRING(cnpj_limpo, i, 1) AS UNSIGNED) * 
                          CASE i 
                              WHEN 1 THEN 5 WHEN 2 THEN 6 WHEN 3 THEN 7 WHEN 4 THEN 8 
                              WHEN 5 THEN 9 WHEN 6 THEN 2 WHEN 7 THEN 3 WHEN 8 THEN 4 
                              WHEN 9 THEN 5 WHEN 10 THEN 6 WHEN 11 THEN 7 WHEN 12 THEN 8 
                          END);
        SET i = i + 1;
    END WHILE;
    
    SET resto = soma % 11;
    SET digito1 = IF(resto < 2, 0, 11 - resto);
    
    -- Verifica primeiro dígito
    IF digito1 != CAST(SUBSTRING(cnpj_limpo, 13, 1) AS UNSIGNED) THEN
        RETURN FALSE;
    END IF;
    
    -- Calcula segundo dígito verificador
    SET soma = 0;
    SET i = 1;
    WHILE i <= 13 DO
        SET soma = soma + (CAST(SUBSTRING(cnpj_limpo, i, 1) AS UNSIGNED) * 
                          CASE i 
                              WHEN 1 THEN 6 WHEN 2 THEN 7 WHEN 3 THEN 8 WHEN 4 THEN 9 
                              WHEN 5 THEN 2 WHEN 6 THEN 3 WHEN 7 THEN 4 WHEN 8 THEN 5 
                              WHEN 9 THEN 6 WHEN 10 THEN 7 WHEN 11 THEN 8 WHEN 12 THEN 9 
                              WHEN 13 THEN 2 
                          END);
        SET i = i + 1;
    END WHILE;
    
    SET resto = soma % 11;
    SET digito2 = IF(resto < 2, 0, 11 - resto);
    
    -- Verifica segundo dígito
    IF digito2 != CAST(SUBSTRING(cnpj_limpo, 14, 1) AS UNSIGNED) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END$$
DELIMITER ;



-- =====================================================
-- CORREÇÕES PARA O SISTEMA DE AGENDAMENTO
-- =====================================================

-- 1. Adicionar campos de auditoria na tabela reunioes
ALTER TABLE reunioes ADD COLUMN created_by char(36) NULL;
ALTER TABLE reunioes ADD COLUMN updated_by char(36) NULL;

-- 2. Adicionar chaves estrangeiras para auditoria
ALTER TABLE reunioes ADD CONSTRAINT fk_reunioes_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reunioes ADD CONSTRAINT fk_reunioes_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Adicionar chave estrangeira para oportunidade (se não existir)
ALTER TABLE reunioes ADD CONSTRAINT fk_reunioes_oportunidade 
FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE;

-- 4. Adicionar constraint de unicidade para participantes
ALTER TABLE reunioes_participantes ADD CONSTRAINT uk_reuniao_participante 
UNIQUE (reuniao_id, participante_id);

-- 5. Adicionar chave estrangeira para reunioes_participantes
ALTER TABLE reunioes_participantes ADD CONSTRAINT fk_reunioes_participantes_reuniao 
FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE;

-- 6. Criar índices para performance do sistema de agendamento
CREATE INDEX idx_reunioes_data_hora ON reunioes(data, hora);
CREATE INDEX idx_reunioes_oportunidade_data ON reunioes(oportunidade_id, data);
CREATE INDEX idx_reunioes_concluida ON reunioes(concluida);
CREATE INDEX idx_reunioes_participantes_reuniao ON reunioes_participantes(reuniao_id);
CREATE INDEX idx_reunioes_participantes_participante ON reunioes_participantes(participante_id);

-- 7. Criar trigger para validar conflitos de horário
DELIMITER $$
CREATE TRIGGER tr_reunioes_validar_conflito
BEFORE INSERT ON reunioes
FOR EACH ROW
BEGIN
    DECLARE conflito_count INT DEFAULT 0;
    
    -- Verificar se já existe reunião no mesmo horário para a mesma oportunidade
    SELECT COUNT(*) INTO conflito_count
    FROM reunioes 
    WHERE oportunidade_id = NEW.oportunidade_id 
    AND data = NEW.data 
    AND hora = NEW.hora
    AND id != COALESCE(NEW.id, '');
    
    IF conflito_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Já existe uma reunião agendada para este horário nesta oportunidade';
    END IF;
END$$

CREATE TRIGGER tr_reunioes_validar_conflito_update
BEFORE UPDATE ON reunioes
FOR EACH ROW
BEGIN
    DECLARE conflito_count INT DEFAULT 0;
    
    -- Verificar se já existe reunião no mesmo horário para a mesma oportunidade
    SELECT COUNT(*) INTO conflito_count
    FROM reunioes 
    WHERE oportunidade_id = NEW.oportunidade_id 
    AND data = NEW.data 
    AND hora = NEW.hora
    AND id != NEW.id;
    
    IF conflito_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Já existe uma reunião agendada para este horário nesta oportunidade';
    END IF;
END$$
DELIMITER ;

-- 8. Criar view para relatórios de reuniões
CREATE OR REPLACE VIEW view_reunioes_detalhadas AS
SELECT 
    r.id as reuniao_id,
    r.titulo as reuniao_titulo,
    r.data as reuniao_data,
    r.hora as reuniao_hora,
    r.local as reuniao_local,
    r.notas as reuniao_notas,
    r.concluida as reuniao_concluida,
    r.created_at as reuniao_created_at,
    r.updated_at as reuniao_updated_at,
    o.id as oportunidade_id,
    o.titulo as oportunidade_titulo,
    o.status as oportunidade_status,
    c.id as cliente_id,
    c.nome as cliente_nome,
    c.contato_email as cliente_email,
    u_created.name as criado_por,
    u_updated.name as atualizado_por,
    COUNT(rp.id) as total_participantes,
    SUM(CASE WHEN rp.confirmado = 1 THEN 1 ELSE 0 END) as participantes_confirmados
FROM reunioes r
LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
LEFT JOIN clientes c ON o.cliente_id = c.id
LEFT JOIN users u_created ON r.created_by = u_created.id
LEFT JOIN users u_updated ON r.updated_by = u_updated.id
LEFT JOIN reunioes_participantes rp ON r.id = rp.reuniao_id
GROUP BY r.id, o.id, c.id, u_created.id, u_updated.id;

-- 9. Criar procedimento para limpeza de reuniões antigas
DELIMITER $$
CREATE PROCEDURE sp_limpeza_reunioes_antigas(IN dias_limite INT)
BEGIN
    DECLARE total_removidas INT DEFAULT 0;
    
    -- Remover reuniões concluídas mais antigas que o limite especificado
    DELETE FROM reunioes 
    WHERE concluida = 1 
    AND data < DATE_SUB(CURDATE(), INTERVAL dias_limite DAY);
    
    SET total_removidas = ROW_COUNT();
    
    SELECT CONCAT('Removidas ', total_removidas, ' reuniões antigas') as resultado;
END$$
DELIMITER ;

-- 10. Criar função para verificar disponibilidade de horário
DELIMITER $$
CREATE FUNCTION fn_verificar_disponibilidade_horario(
    p_oportunidade_id CHAR(36),
    p_data DATE,
    p_hora TIME,
    p_reuniao_id CHAR(36)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE conflito_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO conflito_count
    FROM reunioes 
    WHERE oportunidade_id = p_oportunidade_id 
    AND data = p_data 
    AND hora = p_hora
    AND (p_reuniao_id IS NULL OR id != p_reuniao_id);
    
    RETURN conflito_count = 0;
END$$
DELIMITER ;

-- 11. Criar tabela para templates de reunião (opcional)
CREATE TABLE IF NOT EXISTS reunioes_templates (
    id char(36) PRIMARY KEY,
    nome varchar(255) NOT NULL,
    titulo_padrao varchar(255) NOT NULL,
    duracao_padrao int DEFAULT 60 COMMENT 'Duração em minutos',
    local_padrao varchar(255),
    pauta_padrao text,
    participantes_padrao json COMMENT 'Lista de participantes padrão',
    ativo tinyint(1) DEFAULT 1,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. Criar tabela para histórico de alterações de reuniões
CREATE TABLE IF NOT EXISTS reunioes_historico (
    id char(36) PRIMARY KEY,
    reuniao_id char(36) NOT NULL,
    campo_alterado varchar(100) NOT NULL,
    valor_anterior text,
    valor_novo text,
    alterado_por char(36),
    data_alteracao timestamp DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reuniao_id) REFERENCES reunioes(id) ON DELETE CASCADE,
    FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Criar índices para as novas tabelas
CREATE INDEX idx_reunioes_templates_ativo ON reunioes_templates(ativo);
CREATE INDEX idx_reunioes_historico_reuniao ON reunioes_historico(reuniao_id);
CREATE INDEX idx_reunioes_historico_data ON reunioes_historico(data_alteracao);

-- 14. Criar trigger para auditoria de alterações
DELIMITER $$
CREATE TRIGGER tr_reunioes_auditoria_update
AFTER UPDATE ON reunioes
FOR EACH ROW
BEGIN
    -- Registrar alterações significativas
    IF OLD.titulo != NEW.titulo THEN
        INSERT INTO reunioes_historico (id, reuniao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (UUID(), NEW.id, 'titulo', OLD.titulo, NEW.titulo, NEW.updated_by);
    END IF;
    
    IF OLD.data != NEW.data THEN
        INSERT INTO reunioes_historico (id, reuniao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (UUID(), NEW.id, 'data', OLD.data, NEW.data, NEW.updated_by);
    END IF;
    
    IF OLD.hora != NEW.hora THEN
        INSERT INTO reunioes_historico (id, reuniao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (UUID(), NEW.id, 'hora', OLD.hora, NEW.hora, NEW.updated_by);
    END IF;
    
    IF OLD.concluida != NEW.concluida THEN
        INSERT INTO reunioes_historico (id, reuniao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (UUID(), NEW.id, 'concluida', OLD.concluida, NEW.concluida, NEW.updated_by);
    END IF;
END$$
DELIMITER ;

-- 15. Inserir templates padrão de reunião
INSERT INTO reunioes_templates (id, nome, titulo_padrao, duracao_padrao, local_padrao, pauta_padrao) VALUES
(UUID(), 'Reunião Inicial', 'Reunião Inicial - {cliente_nome}', 60, 'Escritório', 'Apresentação da empresa\nLevantamento de necessidades\nApresentação de soluções'),
(UUID(), 'Apresentação de Proposta', 'Apresentação de Proposta - {cliente_nome}', 90, 'Cliente', 'Apresentação da proposta comercial\nEsclarecimento de dúvidas\nNegociação de termos'),
(UUID(), 'Reunião de Acompanhamento', 'Acompanhamento - {cliente_nome}', 30, 'Online', 'Status do projeto\nPróximos passos\nFeedback do cliente'),
(UUID(), 'Reunião de Fechamento', 'Fechamento - {cliente_nome}', 45, 'Escritório', 'Finalização da negociação\nAssinatura de contrato\nDefinição de cronograma');


-- =====================================================
-- MELHORIAS PARA SISTEMA DE PERFIL DE USUÁRIO
-- =====================================================

-- 1. Adicionar campos para avatar no Cloudinary
ALTER TABLE users ADD COLUMN avatar_public_id VARCHAR(255) NULL COMMENT 'Public ID do avatar no Cloudinary';
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL COMMENT 'Último login do usuário';
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) NULL COMMENT 'IP do último login';
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE COMMENT 'Se o usuário está ativo';

-- 2. Melhorar tabela user_profiles
ALTER TABLE user_profiles ADD COLUMN avatar_backup_url TEXT NULL COMMENT 'URL de backup do avatar';
ALTER TABLE user_profiles ADD COLUMN social_links JSON NULL COMMENT 'Links de redes sociais';
ALTER TABLE user_profiles ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo' COMMENT 'Fuso horário do usuário';
ALTER TABLE user_profiles ADD COLUMN language VARCHAR(10) DEFAULT 'pt-BR' COMMENT 'Idioma preferido';

-- 3. Melhorar tabela user_preferences
ALTER TABLE user_preferences ADD COLUMN push_notifications BOOLEAN DEFAULT TRUE COMMENT 'Notificações push';
ALTER TABLE user_preferences ADD COLUMN marketing_emails BOOLEAN DEFAULT FALSE COMMENT 'Emails de marketing';
ALTER TABLE user_preferences ADD COLUMN security_alerts BOOLEAN DEFAULT TRUE COMMENT 'Alertas de segurança';
ALTER TABLE user_preferences ADD COLUMN data_export_format VARCHAR(20) DEFAULT 'json' COMMENT 'Formato preferido para exportação';

-- 4. Criar tabela para log de atividades do usuário
CREATE TABLE IF NOT EXISTS user_activity_log (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL COMMENT 'Tipo de ação realizada',
    details JSON NULL COMMENT 'Detalhes da ação em JSON',
    ip_address VARCHAR(45) NULL COMMENT 'IP de onde a ação foi realizada',
    user_agent TEXT NULL COMMENT 'User agent do navegador',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_activity_user_date (user_id, created_at),
    INDEX idx_user_activity_action (action),
    INDEX idx_user_activity_date (created_at)
);

-- 5. Criar tabela para tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id CHAR(36) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    email VARCHAR(255) NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100) NULL COMMENT 'Motivo da falha se success = false',
    user_agent TEXT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_attempts_ip_time (ip_address, attempted_at),
    INDEX idx_login_attempts_email_time (email, attempted_at),
    INDEX idx_login_attempts_success (success, attempted_at)
);

-- 6. Criar tabela para sessões ativas
CREATE TABLE IF NOT EXISTS active_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    refresh_token_id CHAR(36) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    device_info JSON NULL COMMENT 'Informações do dispositivo',
    location_info JSON NULL COMMENT 'Informações de localização (cidade, país)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (refresh_token_id) REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    INDEX idx_active_sessions_user (user_id, is_active),
    INDEX idx_active_sessions_activity (last_activity),
    INDEX idx_active_sessions_expires (expires_at)
);

-- 7. Melhorar tabela refresh_tokens
ALTER TABLE refresh_tokens ADD COLUMN is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE refresh_tokens ADD COLUMN last_used_at TIMESTAMP NULL;
ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45) NULL;
ALTER TABLE refresh_tokens ADD COLUMN user_agent TEXT NULL;
ALTER TABLE refresh_tokens ADD COLUMN revoked_at TIMESTAMP NULL;
ALTER TABLE refresh_tokens ADD COLUMN revoked_reason VARCHAR(100) NULL;

-- 8. Criar índices para performance
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_users_last_login ON users(last_login_at);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, is_revoked, expires_at);
CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens(expires_at, is_revoked);

-- 9. Criar tabela para configurações de upload
CREATE TABLE IF NOT EXISTS upload_settings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    max_file_size BIGINT DEFAULT 5242880 COMMENT 'Tamanho máximo em bytes (5MB default)',
    allowed_formats JSON DEFAULT '["jpg", "jpeg", "png", "webp", "gif"]' COMMENT 'Formatos permitidos',
    auto_optimize BOOLEAN DEFAULT TRUE COMMENT 'Otimização automática de imagens',
    watermark_enabled BOOLEAN DEFAULT FALSE COMMENT 'Aplicar marca d\'água',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_upload_settings_user (user_id)
);

-- 10. Criar tabela para histórico de uploads
CREATE TABLE IF NOT EXISTS upload_history (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    file_type VARCHAR(20) NOT NULL COMMENT 'Tipo do arquivo (avatar, document, etc)',
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    cloudinary_public_id VARCHAR(255) NULL,
    cloudinary_url TEXT NULL,
    upload_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, success, failed',
    error_message TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_upload_history_user_type (user_id, file_type),
    INDEX idx_upload_history_status (upload_status),
    INDEX idx_upload_history_date (created_at)
);

-- 11. Criar triggers para auditoria automática
DELIMITER $$
CREATE TRIGGER tr_users_activity_log
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    -- Log de alterações importantes
    IF OLD.name != NEW.name THEN
        INSERT INTO user_activity_log (id, user_id, action, details)
        VALUES (UUID(), NEW.id, 'profile_name_changed', 
                JSON_OBJECT('old_name', OLD.name, 'new_name', NEW.name));
    END IF;
    
    IF OLD.email != NEW.email THEN
        INSERT INTO user_activity_log (id, user_id, action, details)
        VALUES (UUID(), NEW.id, 'email_changed', 
                JSON_OBJECT('old_email', OLD.email, 'new_email', NEW.email));
    END IF;
    
    IF OLD.avatar_url != NEW.avatar_url THEN
        INSERT INTO user_activity_log (id, user_id, action, details)
        VALUES (UUID(), NEW.id, 'avatar_changed', 
                JSON_OBJECT('old_avatar', OLD.avatar_url, 'new_avatar', NEW.avatar_url));
    END IF;
    
    IF OLD.password != NEW.password THEN
        INSERT INTO user_activity_log (id, user_id, action, details)
        VALUES (UUID(), NEW.id, 'password_changed', JSON_OBJECT('timestamp', NOW()));
    END IF;
END$$

CREATE TRIGGER tr_user_profiles_activity_log
AFTER UPDATE ON user_profiles
FOR EACH ROW
BEGIN
    INSERT INTO user_activity_log (id, user_id, action, details)
    VALUES (UUID(), NEW.user_id, 'profile_updated', 
            JSON_OBJECT('updated_fields', 
                        JSON_ARRAY(
                            CASE WHEN OLD.bio != NEW.bio THEN 'bio' ELSE NULL END,
                            CASE WHEN OLD.phone != NEW.phone THEN 'phone' ELSE NULL END,
                            CASE WHEN OLD.address != NEW.address THEN 'address' ELSE NULL END
                        )
                       ));
END$$

CREATE TRIGGER tr_user_preferences_activity_log
AFTER UPDATE ON user_preferences
FOR EACH ROW
BEGIN
    INSERT INTO user_activity_log (id, user_id, action, details)
    VALUES (UUID(), NEW.user_id, 'preferences_updated', 
            JSON_OBJECT('timestamp', NOW()));
END$$
DELIMITER ;

-- 12. Criar procedimentos para limpeza automática
DELIMITER $$
CREATE PROCEDURE sp_cleanup_expired_tokens()
BEGIN
    DECLARE total_removed INT DEFAULT 0;
    
    -- Remover refresh tokens expirados
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    
    SET total_removed = ROW_COUNT();
    
    -- Remover sessões inativas há mais de 30 dias
    DELETE FROM active_sessions 
    WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY) OR is_active = FALSE;
    
    SET total_removed = total_removed + ROW_COUNT();
    
    -- Remover tentativas de login antigas (mais de 90 dias)
    DELETE FROM login_attempts 
    WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    SET total_removed = total_removed + ROW_COUNT();
    
    SELECT CONCAT('Removidos ', total_removed, ' registros expirados') as resultado;
END$$

CREATE PROCEDURE sp_cleanup_old_activity_logs(IN dias_limite INT)
BEGIN
    DECLARE total_removed INT DEFAULT 0;
    
    -- Remover logs de atividade antigos
    DELETE FROM user_activity_log 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL dias_limite DAY);
    
    SET total_removed = ROW_COUNT();
    
    SELECT CONCAT('Removidos ', total_removed, ' logs de atividade antigos') as resultado;
END$$

CREATE PROCEDURE sp_get_user_security_summary(IN p_user_id CHAR(36))
BEGIN
    SELECT 
        u.id,
        u.name,
        u.email,
        u.last_login_at,
        u.last_login_ip,
        COUNT(DISTINCT rt.id) as active_refresh_tokens,
        COUNT(DISTINCT as_table.id) as active_sessions,
        COUNT(DISTINCT la.id) as recent_login_attempts,
        MAX(ual.created_at) as last_activity
    FROM users u
    LEFT JOIN refresh_tokens rt ON u.id = rt.user_id AND rt.is_revoked = FALSE AND rt.expires_at > NOW()
    LEFT JOIN active_sessions as_table ON u.id = as_table.user_id AND as_table.is_active = TRUE
    LEFT JOIN login_attempts la ON u.email = la.email AND la.attempted_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    LEFT JOIN user_activity_log ual ON u.id = ual.user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;
END$$
DELIMITER ;

-- 13. Criar função para validar força da senha
DELIMITER $$
CREATE FUNCTION fn_validate_password_strength(password_text TEXT) 
RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE strength VARCHAR(20) DEFAULT 'weak';
    DECLARE score INT DEFAULT 0;
    
    -- Verificar comprimento
    IF LENGTH(password_text) >= 8 THEN SET score = score + 1; END IF;
    IF LENGTH(password_text) >= 12 THEN SET score = score + 1; END IF;
    
    -- Verificar caracteres
    IF password_text REGEXP '[a-z]' THEN SET score = score + 1; END IF;
    IF password_text REGEXP '[A-Z]' THEN SET score = score + 1; END IF;
    IF password_text REGEXP '[0-9]' THEN SET score = score + 1; END IF;
    IF password_text REGEXP '[^a-zA-Z0-9]' THEN SET score = score + 1; END IF;
    
    -- Determinar força
    CASE 
        WHEN score >= 5 THEN SET strength = 'strong';
        WHEN score >= 3 THEN SET strength = 'medium';
        ELSE SET strength = 'weak';
    END CASE;
    
    RETURN strength;
END$$
DELIMITER ;

-- 14. Inserir configurações padrão para usuários existentes
INSERT IGNORE INTO user_profiles (id, user_id, created_at, updated_at)
SELECT UUID(), id, NOW(), NOW() FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles);

INSERT IGNORE INTO user_preferences (id, user_id, email_notifications, sms_notifications, theme, created_at, updated_at)
SELECT UUID(), id, TRUE, FALSE, 'light', NOW(), NOW() FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences);

INSERT IGNORE INTO upload_settings (id, user_id, created_at, updated_at)
SELECT UUID(), id, NOW(), NOW() FROM users 
WHERE id NOT IN (SELECT user_id FROM upload_settings);

-- 15. Criar view para perfil completo do usuário
CREATE OR REPLACE VIEW view_user_profiles_complete AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.role,
    u.avatar_url,
    u.avatar_public_id,
    u.last_login_at,
    u.last_login_ip,
    u.is_active,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    
    up.bio,
    up.phone,
    up.address as position,
    up.social_links,
    up.timezone,
    up.language,
    
    upr.email_notifications,
    upr.sms_notifications,
    upr.push_notifications,
    upr.marketing_emails,
    upr.security_alerts,
    upr.theme,
    upr.data_export_format,
    
    us.max_file_size,
    us.allowed_formats,
    us.auto_optimize,
    us.watermark_enabled,
    
    COUNT(DISTINCT rt.id) as active_tokens,
    COUNT(DISTINCT as_table.id) as active_sessions,
    MAX(ual.created_at) as last_activity
    
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_preferences upr ON u.id = upr.user_id
LEFT JOIN upload_settings us ON u.id = us.user_id
LEFT JOIN refresh_tokens rt ON u.id = rt.user_id AND rt.is_revoked = FALSE AND rt.expires_at > NOW()
LEFT JOIN active_sessions as_table ON u.id = as_table.user_id AND as_table.is_active = TRUE
LEFT JOIN user_activity_log ual ON u.id = ual.user_id
GROUP BY u.id, up.id, upr.id, us.id;

-- 16. Criar evento para limpeza automática (executar diariamente)
CREATE EVENT IF NOT EXISTS ev_daily_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    CALL sp_cleanup_expired_tokens();
    CALL sp_cleanup_old_activity_logs(365); -- Manter logs por 1 ano
END;

