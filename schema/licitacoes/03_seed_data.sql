-- Inserir dados iniciais para categorias de documentos
INSERT INTO crmonefactory.documento_categorias (nome, descricao, cor, icone)
VALUES
  ('Edital', 'Documentos de edital e anexos', '#4299E1', 'file-text'),
  ('Habilitação', 'Documentos para habilitação', '#48BB78', 'file-check'),
  ('Proposta', 'Propostas comerciais e técnicas', '#F6AD55', 'file-digit'),
  ('Contrato', 'Contratos e aditivos', '#805AD5', 'file-contract'),
  ('Recurso', 'Recursos administrativos', '#F56565', 'file-warning'),
  ('Fiscal', 'Documentos fiscais e tributários', '#667EEA', 'receipt'),
  ('Técnico', 'Documentos técnicos e certificações', '#ED8936', 'file-certificate'),
  ('Administrativo', 'Documentos administrativos', '#A0AEC0', 'clipboard')
ON CONFLICT DO NOTHING;

-- Inserir modalidades de licitação comuns (para uso em selects)
CREATE TABLE IF NOT EXISTS crmonefactory.modalidades_licitacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE
);

INSERT INTO crmonefactory.modalidades_licitacao (nome, descricao)
VALUES
  ('Pregão Eletrônico', 'Modalidade de licitação do tipo menor preço, para aquisição de bens e serviços comuns, realizada em ambiente virtual.'),
  ('Pregão Presencial', 'Modalidade de licitação do tipo menor preço, para aquisição de bens e serviços comuns, realizada presencialmente.'),
  ('Concorrência', 'Modalidade de licitação para contratos de grande valor, obras e serviços de engenharia complexos.'),
  ('Tomada de Preços', 'Modalidade de licitação para contratos de valor médio.'),
  ('Convite', 'Modalidade de licitação mais simples, para contratos de pequeno valor.'),
  ('Concurso', 'Modalidade de licitação para escolha de trabalho técnico, científico ou artístico.'),
  ('Leilão', 'Modalidade de licitação para venda de bens móveis inservíveis ou produtos legalmente apreendidos.'),
  ('Dispensa de Licitação', 'Contratação direta sem licitação, em casos específicos previstos na Lei 8.666/93.'),
  ('Inexigibilidade', 'Contratação direta quando houver inviabilidade de competição.'),
  ('RDC', 'Regime Diferenciado de Contratações Públicas.')
ON CONFLICT DO NOTHING;
