-- Inserir dados de teste para órgãos
INSERT INTO crmonefactory.orgaos (nome, cnpj, cidade, estado, endereco, tipo, segmento, origem_lead, descricao)
VALUES
  ('Prefeitura Municipal de São Paulo', '12.345.678/0001-01', 'São Paulo', 'SP', 'Rua da Prefeitura, 123', 'Municipal', 'Administração Pública', 'Site', 'Prefeitura da cidade de São Paulo'),
  ('Governo do Estado de São Paulo', '23.456.789/0001-02', 'São Paulo', 'SP', 'Avenida do Estado, 456', 'Estadual', 'Administração Pública', 'Indicação', 'Governo do Estado de São Paulo'),
  ('Ministério da Educação', '34.567.890/0001-03', 'Brasília', 'DF', 'Esplanada dos Ministérios, Bloco L', 'Federal', 'Educação', 'Portal de Compras', 'Ministério responsável pela educação no Brasil')
ON CONFLICT DO NOTHING;

-- Inserir dados de teste para licitações
INSERT INTO crmonefactory.licitacoes 
  (titulo, orgao_id, status, data_abertura, data_publicacao, valor_estimado, modalidade, objeto, numero_edital)
VALUES
  (
    'Aquisição de Computadores', 
    (SELECT id FROM crmonefactory.orgaos WHERE nome = 'Prefeitura Municipal de São Paulo' LIMIT 1),
    'analise_interna',
    '2025-05-01',
    '2025-04-01',
    500000.00,
    'Pregão Eletrônico',
    'Aquisição de 100 computadores para as escolas municipais',
    '001/2025'
  ),
  (
    'Serviços de Manutenção Predial', 
    (SELECT id FROM crmonefactory.orgaos WHERE nome = 'Governo do Estado de São Paulo' LIMIT 1),
    'aguardando_pregao',
    '2025-06-15',
    '2025-05-15',
    1200000.00,
    'Concorrência',
    'Contratação de empresa especializada em manutenção predial para os prédios administrativos',
    'CONC-002/2025'
  ),
  (
    'Fornecimento de Merenda Escolar', 
    (SELECT id FROM crmonefactory.orgaos WHERE nome = 'Ministério da Educação' LIMIT 1),
    'envio_documentos',
    '2025-05-20',
    '2025-04-20',
    3000000.00,
    'Pregão Eletrônico',
    'Fornecimento de merenda escolar para as escolas federais do estado',
    'PE-003/2025'
  )
ON CONFLICT DO NOTHING;

-- Inserir dados de teste para documentos
INSERT INTO crmonefactory.documentos
  (nome, licitacao_id, categoria_id, tipo, status, url)
VALUES
  (
    'Edital de Licitação - Computadores.pdf',
    (SELECT id FROM crmonefactory.licitacoes WHERE titulo = 'Aquisição de Computadores' LIMIT 1),
    (SELECT id FROM crmonefactory.documento_categorias WHERE nome = 'Edital' LIMIT 1),
    'pdf',
    'ativo',
    'https://exemplo.com/edital.pdf'
  ),
  (
    'Proposta Comercial - Manutenção.pdf',
    (SELECT id FROM crmonefactory.licitacoes WHERE titulo = 'Serviços de Manutenção Predial' LIMIT 1),
    (SELECT id FROM crmonefactory.documento_categorias WHERE nome = 'Proposta' LIMIT 1),
    'pdf',
    'ativo',
    'https://exemplo.com/proposta.pdf'
  ),
  (
    'Documentos de Habilitação - Merenda.zip',
    (SELECT id FROM crmonefactory.licitacoes WHERE titulo = 'Fornecimento de Merenda Escolar' LIMIT 1),
    (SELECT id FROM crmonefactory.documento_categorias WHERE nome = 'Habilitação' LIMIT 1),
    'zip',
    'ativo',
    'https://exemplo.com/habilitacao.zip'
  )
ON CONFLICT DO NOTHING;
