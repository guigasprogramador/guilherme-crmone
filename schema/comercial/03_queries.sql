-- Consultas SQL para o módulo comercial

-- Consulta para listar todas as oportunidades com informações de cliente e responsável
SELECT 
    o.id,
    o.titulo,
    o.valor,
    o.prazo,
    o.status,
    o.data_criacao,
    o.data_atualizacao,
    c.id AS cliente_id,
    c.nome AS cliente,
    r.id AS responsavel_id,
    r.nome AS responsavel
FROM 
    oportunidades o
    JOIN clientes c ON o.cliente_id = c.id
    JOIN responsaveis r ON o.responsavel_id = r.id
WHERE 
    c.ativo = TRUE
ORDER BY 
    o.data_atualizacao DESC;

-- Consulta para filtrar oportunidades
SELECT 
    o.id,
    o.titulo,
    o.valor,
    o.prazo,
    o.status,
    o.data_criacao,
    o.data_atualizacao,
    c.id AS cliente_id,
    c.nome AS cliente,
    r.id AS responsavel_id,
    r.nome AS responsavel
FROM 
    oportunidades o
    JOIN clientes c ON o.cliente_id = c.id
    JOIN responsaveis r ON o.responsavel_id = r.id
WHERE 
    c.ativo = TRUE
    AND (o.titulo LIKE :termo OR c.nome LIKE :termo)
    AND (o.status = :status OR :status = 'todos')
    AND (c.id = :cliente_id OR :cliente_id = 'todos')
    AND (r.id = :responsavel_id OR :responsavel_id = 'todos')
    AND (o.data_criacao >= :data_inicio OR :data_inicio IS NULL)
    AND (o.data_criacao <= :data_fim OR :data_fim IS NULL)
ORDER BY 
    o.data_atualizacao DESC;

-- Consulta para obter detalhes de uma oportunidade específica
SELECT 
    o.id,
    o.titulo,
    o.valor,
    o.prazo,
    o.status,
    o.descricao,
    o.data_criacao,
    o.data_atualizacao,
    c.id AS cliente_id,
    c.nome AS cliente,
    c.cnpj AS cliente_cnpj,
    c.contato_nome AS cliente_contato_nome,
    c.contato_telefone AS cliente_contato_telefone,
    c.contato_email AS cliente_contato_email,
    r.id AS responsavel_id,
    r.nome AS responsavel,
    r.email AS responsavel_email,
    r.telefone AS responsavel_telefone
FROM 
    oportunidades o
    JOIN clientes c ON o.cliente_id = c.id
    JOIN responsaveis r ON o.responsavel_id = r.id
WHERE 
    o.id = :id;

-- Consulta para listar notas de uma oportunidade
SELECT 
    n.id,
    n.conteudo,
    n.data_criacao,
    r.nome AS responsavel
FROM 
    notas n
    JOIN responsaveis r ON n.responsavel_id = r.id
WHERE 
    n.oportunidade_id = :oportunidade_id
ORDER BY 
    n.data_criacao DESC;

-- Consulta para listar reuniões de uma oportunidade
SELECT 
    id,
    titulo,
    descricao,
    data_hora,
    local,
    participantes,
    concluida,
    data_criacao,
    data_atualizacao
FROM 
    reunioes
WHERE 
    oportunidade_id = :oportunidade_id
ORDER BY 
    data_hora;

-- Consulta para estatísticas - Total de oportunidades por status
SELECT 
    status,
    COUNT(*) AS total
FROM 
    oportunidades
GROUP BY 
    status;

-- Consulta para estatísticas - Valor total de oportunidades por status
SELECT 
    status,
    SUM(valor) AS valor_total
FROM 
    oportunidades
GROUP BY 
    status;

-- Consulta para estatísticas - Taxa de conversão (oportunidades ganhas / total)
SELECT 
    (COUNT(CASE WHEN status = 'fechado_ganho' THEN 1 END) * 100.0 / COUNT(*)) AS taxa_conversao
FROM 
    oportunidades;

-- Consulta para estatísticas - Tempo médio de fechamento (em dias)
SELECT 
    AVG(EXTRACT(DAY FROM (data_atualizacao - data_criacao))) AS tempo_medio_fechamento
FROM 
    oportunidades
WHERE 
    status IN ('fechado_ganho', 'fechado_perdido');

-- Consulta para estatísticas - Desempenho por responsável
SELECT 
    r.nome AS responsavel,
    COUNT(*) AS total_oportunidades,
    COUNT(CASE WHEN o.status = 'fechado_ganho' THEN 1 END) AS oportunidades_ganhas,
    SUM(CASE WHEN o.status = 'fechado_ganho' THEN o.valor ELSE 0 END) AS valor_total_ganho,
    (COUNT(CASE WHEN o.status = 'fechado_ganho' THEN 1 END) * 100.0 / COUNT(*)) AS taxa_conversao
FROM 
    oportunidades o
    JOIN responsaveis r ON o.responsavel_id = r.id
GROUP BY 
    r.nome
ORDER BY 
    valor_total_ganho DESC;
