-- Triggers para o módulo comercial

-- Trigger para atualizar a data de atualização ao modificar uma oportunidade
DELIMITER //
CREATE TRIGGER before_oportunidade_update
BEFORE UPDATE ON oportunidades
FOR EACH ROW
BEGIN
    SET NEW.data_atualizacao = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger para registrar alterações de status de oportunidades em um log
DELIMITER //
CREATE TRIGGER after_oportunidade_status_change
AFTER UPDATE ON oportunidades
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO log_alteracoes_status (
            oportunidade_id,
            status_anterior,
            status_novo,
            data_alteracao
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CURRENT_TIMESTAMP
        );
    END IF;
END //
DELIMITER ;

-- Trigger para validar o status da oportunidade
DELIMITER //
CREATE TRIGGER before_oportunidade_insert_update
BEFORE INSERT ON oportunidades
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('novo_lead', 'agendamento_reuniao', 'levantamento_oportunidades', 
                         'proposta_enviada', 'negociacao', 'fechado_ganho', 'fechado_perdido') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Status de oportunidade inválido';
    END IF;
END //
DELIMITER ;

-- Tabela de log para alterações de status
CREATE TABLE IF NOT EXISTS log_alteracoes_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oportunidade_id VARCHAR(36) NOT NULL,
    status_anterior VARCHAR(50) NOT NULL,
    status_novo VARCHAR(50) NOT NULL,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE
);
