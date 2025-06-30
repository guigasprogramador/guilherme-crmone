-- Script para popular a tabela de clientes no schema crmonefactory

INSERT INTO crmonefactory.clientes 
(nome, cnpj, contato_nome, contato_telefone, contato_email, endereco, cidade, estado, segmento, ativo, descricao, observacoes, faturamento)
VALUES
-- Prefeituras
('Prefeitura Municipal de São Paulo', '45.658.987/0001-01', 'Carlos Silva', '(11) 3333-4444', 'carlos.silva@prefeiturasp.gov.br', 'Viaduto do Chá, 15', 'São Paulo', 'SP', 'Administração Pública', TRUE, 'Maior prefeitura do Brasil', 'Cliente desde 2022', 'Acima de R$ 1 bilhão'),
('Prefeitura Municipal de Belo Horizonte', '18.715.383/0001-40', 'Ana Oliveira', '(31) 3277-5555', 'ana.oliveira@pbh.gov.br', 'Av. Afonso Pena, 1212', 'Belo Horizonte', 'MG', 'Administração Pública', TRUE, 'Prefeitura com projetos inovadores', 'Interesse em soluções digitais', 'Entre R$ 500 milhões e R$ 1 bilhão'),
('Prefeitura Municipal de Curitiba', '76.417.005/0001-86', 'Roberto Mendes', '(41) 3350-8888', 'roberto.mendes@curitiba.pr.gov.br', 'Av. Cândido de Abreu, 817', 'Curitiba', 'PR', 'Administração Pública', TRUE, 'Referência em gestão urbana', 'Projetos de cidades inteligentes', 'Entre R$ 100 milhões e R$ 500 milhões'),

-- Hospitais
('Hospital Albert Einstein', '60.765.823/0001-30', 'Mariana Costa', '(11) 2151-1233', 'mariana.costa@einstein.br', 'Av. Albert Einstein, 627', 'São Paulo', 'SP', 'Saúde', TRUE, 'Hospital de referência nacional', 'Interesse em tecnologia médica avançada', 'Acima de R$ 1 bilhão'),
('Hospital Sírio-Libanês', '61.590.410/0001-24', 'João Ferreira', '(11) 3394-5432', 'joao.ferreira@hsl.org.br', 'Rua Dona Adma Jafet, 91', 'São Paulo', 'SP', 'Saúde', TRUE, 'Centro de excelência em tratamentos', 'Parceria em projetos de pesquisa', 'Entre R$ 500 milhões e R$ 1 bilhão'),
('Hospital Moinhos de Vento', '92.685.833/0001-51', 'Cristina Souza', '(51) 3314-3434', 'cristina.souza@hmv.org.br', 'Rua Ramiro Barcelos, 910', 'Porto Alegre', 'RS', 'Saúde', TRUE, 'Referência em atendimento humanizado', 'Busca soluções para gestão hospitalar', 'Entre R$ 100 milhões e R$ 500 milhões'),

-- Empresas de Tecnologia
('TechBrasil Soluções', '04.123.456/0001-78', 'Pedro Almeida', '(11) 4002-8922', 'pedro.almeida@techbrasil.com.br', 'Av. Paulista, 1000', 'São Paulo', 'SP', 'Tecnologia', TRUE, 'Empresa de software em expansão', 'Interesse em parcerias estratégicas', 'Entre R$ 10 milhões e R$ 50 milhões'),
('Inovação Digital Ltda', '15.789.012/0001-34', 'Fernanda Lima', '(21) 3030-5050', 'fernanda.lima@inovacaodigital.com.br', 'Av. Rio Branco, 156', 'Rio de Janeiro', 'RJ', 'Tecnologia', TRUE, 'Startup com foco em IA', 'Crescimento acelerado nos últimos 2 anos', 'Entre R$ 1 milhão e R$ 10 milhões'),
('DataSys Informática', '22.345.678/0001-90', 'Ricardo Gomes', '(31) 2525-6767', 'ricardo.gomes@datasys.com.br', 'Rua da Bahia, 478', 'Belo Horizonte', 'MG', 'Tecnologia', TRUE, 'Especializada em big data', 'Potencial para projetos de longo prazo', 'Entre R$ 10 milhões e R$ 50 milhões'),

-- Indústrias
('Metalúrgica Nacional S.A.', '33.456.789/0001-12', 'Antônio Vieira', '(11) 4433-7788', 'antonio.vieira@metalurgica.com.br', 'Rodovia Anhanguera, km 15', 'Osasco', 'SP', 'Indústria', TRUE, 'Líder no setor metalúrgico', 'Busca modernização de processos', 'Entre R$ 100 milhões e R$ 500 milhões'),
('Química Brasil Ltda', '44.567.890/0001-23', 'Luciana Santos', '(19) 3232-9898', 'luciana.santos@quimicabrasil.com.br', 'Rodovia Campinas-Paulínia, km 5', 'Paulínia', 'SP', 'Indústria Química', TRUE, 'Produção de insumos industriais', 'Projetos de sustentabilidade em andamento', 'Entre R$ 50 milhões e R$ 100 milhões'),
('Alimentos Naturais S.A.', '55.678.901/0001-34', 'Marcelo Dias', '(51) 3131-4545', 'marcelo.dias@alimentosnaturais.com.br', 'Av. das Indústrias, 1500', 'Gravataí', 'RS', 'Alimentos', TRUE, 'Foco em produtos orgânicos', 'Expansão para mercado internacional', 'Entre R$ 50 milhões e R$ 100 milhões'),

-- Instituições de Ensino
('Universidade Inovação', '66.789.012/0001-45', 'Patrícia Lopes', '(11) 5544-6677', 'patricia.lopes@uniinovacao.edu.br', 'Av. da Educação, 2000', 'São Paulo', 'SP', 'Educação', TRUE, 'Referência em pesquisa acadêmica', 'Interesse em parcerias para projetos educacionais', 'Entre R$ 50 milhões e R$ 100 milhões'),
('Colégio Futuro', '77.890.123/0001-56', 'Rafael Martins', '(21) 2727-3838', 'rafael.martins@colegiofuturo.edu.br', 'Rua das Acácias, 500', 'Rio de Janeiro', 'RJ', 'Educação', TRUE, 'Ensino fundamental e médio de qualidade', 'Busca soluções tecnológicas para educação', 'Entre R$ 10 milhões e R$ 50 milhões'),
('Instituto Técnico Profissional', '88.901.234/0001-67', 'Camila Rocha', '(41) 3636-4949', 'camila.rocha@institutotecnico.edu.br', 'Av. Sete de Setembro, 3165', 'Curitiba', 'PR', 'Educação Profissional', TRUE, 'Formação técnica especializada', 'Parceria para desenvolvimento de cursos', 'Entre R$ 1 milhão e R$ 10 milhões');