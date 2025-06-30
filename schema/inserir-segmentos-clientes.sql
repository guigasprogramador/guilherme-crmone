-- Script para inserir segmentos de clientes no banco de dados
-- Executar este script no SQL Editor do Supabase após criar a tabela segmentos_clientes

BEGIN;

-- Inserir segmentos de clientes
INSERT INTO crmonefactory.segmentos_clientes (nome, descricao)
VALUES
  ('Indústria', 'Empresas do setor industrial, fábricas, manufaturas'),
  ('Comércio', 'Empresas de comércio varejista e atacadista'),
  ('Serviços', 'Empresas prestadoras de serviços gerais'),
  ('Tecnologia', 'Empresas de tecnologia, software, hardware, e serviços digitais'),
  ('Saúde', 'Hospitais, clínicas, laboratórios e serviços de saúde'),
  ('Educação', 'Escolas, universidades, cursos e treinamentos'),
  ('Governo', 'Órgãos públicos, agências governamentais e instituições públicas'),
  ('Construção', 'Construtoras, incorporadoras e serviços de engenharia'),
  ('Financeiro', 'Bancos, seguradoras, corretoras e serviços financeiros'),
  ('Agronegócio', 'Agricultura, pecuária e agroindústria'),
  ('Energia', 'Geração, transmissão e distribuição de energia'),
  ('Logística', 'Transporte, logística e armazenamento'),
  ('Outros', 'Outros segmentos não classificados')
ON CONFLICT (nome) DO NOTHING;

COMMIT;
