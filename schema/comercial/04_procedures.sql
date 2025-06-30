-- Stored procedures para o módulo comercial

-- Procedure para atualizar o status de uma oportunidade
DELIMITER //
CREATE PROCEDURE atualizar_status_oportunidade(
    IN p_id VARCHAR(36),
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE oportunidades
    SET 
        status = p_status,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE 
        id = p_id;
END //
DELIMITER ;

-- Procedure para marcar uma reunião como concluída
DELIMITER //
CREATE PROCEDURE marcar_reuniao_concluida(
    IN p_id VARCHAR(36)
)
BEGIN
    UPDATE reunioes
    SET 
        concluida = TRUE,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE 
        id = p_id;
END //
DELIMITER ;

-- Procedure para desativar um cliente (exclusão lógica)
DELIMITER //
CREATE PROCEDURE desativar_cliente(
    IN p_id VARCHAR(36)
)
BEGIN
    UPDATE clientes
    SET 
        ativo = FALSE
    WHERE 
        id = p_id;
END //
DELIMITER ;

-- Procedure para desativar um responsável (exclusão lógica)
DELIMITER //
CREATE PROCEDURE desativar_responsavel(
    IN p_id VARCHAR(36)
)
BEGIN
    UPDATE responsaveis
    SET 
        ativo = FALSE
    WHERE 
        id = p_id;
END //
DELIMITER ;

-- Procedure para gerar relatório de oportunidades por período
DELIMITER //
CREATE PROCEDURE relatorio_oportunidades_periodo(
    IN p_data_inicio DATE,
    IN p_data_fim DATE
)
BEGIN
    SELECT 
        o.id,
        o.titulo,
        o.valor,
        o.status,
        o.data_criacao,
        c.nome AS cliente,
        r.nome AS responsavel
    FROM 
        oportunidades o
        JOIN clientes c ON o.cliente_id = c.id
        JOIN responsaveis r ON o.responsavel_id = r.id
    WHERE 
        o.data_criacao BETWEEN p_data_inicio AND p_data_fim
    ORDER BY 
        o.data_criacao DESC;
END //
DELIMITER ;

-- Procedure para gerar relatório de desempenho de vendas
DELIMITER //
CREATE PROCEDURE relatorio_desempenho_vendas()
BEGIN
    SELECT 
        r.nome AS responsavel,
        COUNT(*) AS total_oportunidades,
        COUNT(CASE WHEN o.status = 'fechado_ganho' THEN 1 END) AS oportunidades_ganhas,
        SUM(CASE WHEN o.status = 'fechado_ganho' THEN o.valor ELSE 0 END) AS valor_total_ganho,
        (COUNT(CASE WHEN o.status = 'fechado_ganho' THEN 1 END) * 100.0 / 
         NULLIF(COUNT(*), 0)) AS taxa_conversao
    FROM 
        oportunidades o
        JOIN responsaveis r ON o.responsavel_id = r.id
    GROUP BY 
        r.nome
    ORDER BY 
        valor_total_ganho DESC;
END //
DELIMITER ;
