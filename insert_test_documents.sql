-- Script para inserir documentos de teste vinculados a oportunidades
-- Banco: crmone-teste

USE `crmone-teste`;

-- Primeiro, vamos verificar se existem oportunidades
SELECT id, titulo FROM oportunidades LIMIT 5;

-- Inserir documentos de teste vinculados às oportunidades existentes
-- Substitua os IDs das oportunidades pelos IDs reais do seu banco

-- Documento 1 - Proposta Comercial
INSERT INTO documentos (
    id,
    nome,
    tipo,
    categoria,
    descricao,
    oportunidade_id,
    url_documento,
    formato,
    tamanho,
    status,
    criado_por,
    data_criacao,
    data_atualizacao
) VALUES (
    UUID(),
    'Proposta Comercial - SRP Gurgel.pdf',
    'proposta',
    'Comercial',
    'Proposta comercial detalhada para implementação do sistema SRP',
    (SELECT id FROM oportunidades LIMIT 1),
    'https://example.com/proposta-srp-gurgel.pdf',
    'pdf',
    2048576,
    'ativo',
    (SELECT id FROM users LIMIT 1),
    NOW(),
    NOW()
);

-- Documento 2 - Especificação Técnica
INSERT INTO documentos (
    id,
    nome,
    tipo,
    categoria,
    descricao,
    oportunidade_id,
    url_documento,
    formato,
    tamanho,
    status,
    criado_por,
    data_criacao,
    data_atualizacao
) VALUES (
    UUID(),
    'Especificação Técnica - Sistema SRP.docx',
    'especificacao',
    'Técnico',
    'Documento com especificações técnicas do sistema',
    (SELECT id FROM oportunidades LIMIT 1),
    'https://example.com/especificacao-tecnica.docx',
    'docx',
    1024000,
    'ativo',
    (SELECT id FROM users LIMIT 1),
    NOW(),
    NOW()
);

-- Documento 3 - Contrato
INSERT INTO documentos (
    id,
    nome,
    tipo,
    categoria,
    descricao,
    oportunidade_id,
    url_documento,
    formato,
    tamanho,
    status,
    criado_por,
    data_criacao,
    data_atualizacao
) VALUES (
    UUID(),
    'Minuta de Contrato - Gurgel.pdf',
    'contrato',
    'Jurídico',
    'Minuta de contrato para prestação de serviços',
    (SELECT id FROM oportunidades LIMIT 1),
    'https://example.com/contrato-gurgel.pdf',
    'pdf',
    3072000,
    'ativo',
    (SELECT id FROM users LIMIT 1),
    NOW(),
    NOW()
);

-- Verificar se os documentos foram inseridos
SELECT 
    d.nome,
    d.tipo,
    d.formato,
    o.titulo as oportunidade_titulo
FROM documentos d
JOIN oportunidades o ON d.oportunidade_id = o.id
WHERE d.oportunidade_id IS NOT NULL;