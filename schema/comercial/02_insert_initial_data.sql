-- Inserção de dados iniciais para o módulo comercial

-- Inserção de clientes
INSERT INTO clientes (id, nome, cnpj, contato_nome, contato_telefone, contato_email, endereco, segmento, data_cadastro, ativo)
VALUES
    ('c1', 'Prefeitura de São Paulo', '12.345.678/0001-01', 'João Silva', '(11) 98765-4321', 'joao.silva@prefeiturasp.gov.br', 'Rua da Prefeitura, 123, São Paulo - SP', 'Governo Municipal', CURRENT_TIMESTAMP, TRUE),
    ('c2', 'Secretaria de Educação', '23.456.789/0001-02', 'Maria Oliveira', '(11) 97654-3210', 'maria.oliveira@educacao.gov.br', 'Avenida da Educação, 456, São Paulo - SP', 'Governo Estadual', CURRENT_TIMESTAMP, TRUE),
    ('c3', 'Hospital Municipal', '34.567.890/0001-03', 'Pedro Santos', '(11) 96543-2109', 'pedro.santos@hospital.gov.br', 'Praça da Saúde, 789, São Paulo - SP', 'Saúde', CURRENT_TIMESTAMP, TRUE),
    ('c4', 'Departamento de Transportes', '45.678.901/0001-04', 'Ana Costa', '(11) 95432-1098', 'ana.costa@transportes.gov.br', 'Rua da Mobilidade, 101, São Paulo - SP', 'Transporte', CURRENT_TIMESTAMP, TRUE),
    ('c5', 'Governo do Estado', '56.789.012/0001-05', 'Carlos Ferreira', '(11) 94321-0987', 'carlos.ferreira@governo.gov.br', 'Avenida do Estado, 202, São Paulo - SP', 'Governo Estadual', CURRENT_TIMESTAMP, TRUE),
    ('c6', 'Prefeitura de Campinas', '67.890.123/0001-06', 'Lucia Mendes', '(19) 93210-9876', 'lucia.mendes@campinas.gov.br', 'Praça Central, 303, Campinas - SP', 'Governo Municipal', CURRENT_TIMESTAMP, TRUE),
    ('c7', 'Hospital Regional', '78.901.234/0001-07', 'Roberto Alves', '(11) 92109-8765', 'roberto.alves@hospitalregional.org', 'Avenida da Saúde, 404, São Paulo - SP', 'Saúde', CURRENT_TIMESTAMP, TRUE);

-- Inserção de responsáveis
INSERT INTO responsaveis (id, nome, email, telefone, cargo, departamento, data_cadastro, ativo)
VALUES
    ('r1', 'Ana Silva', 'ana.silva@empresa.com.br', '(11) 98765-4321', 'Gerente de Contas', 'Comercial', CURRENT_TIMESTAMP, TRUE),
    ('r2', 'Carlos Oliveira', 'carlos.oliveira@empresa.com.br', '(11) 97654-3210', 'Consultor de Vendas', 'Comercial', CURRENT_TIMESTAMP, TRUE),
    ('r3', 'Pedro Santos', 'pedro.santos@empresa.com.br', '(11) 96543-2109', 'Diretor Comercial', 'Diretoria', CURRENT_TIMESTAMP, TRUE),
    ('r4', 'Maria Souza', 'maria.souza@empresa.com.br', '(11) 95432-1098', 'Analista de Negócios', 'Comercial', CURRENT_TIMESTAMP, TRUE);

-- Inserção de oportunidades
INSERT INTO oportunidades (id, titulo, cliente_id, responsavel_id, valor, prazo, status, descricao, data_criacao, data_atualizacao)
VALUES
    ('1', 'Sistema de Gestão Municipal', 'c1', 'r1', 450000.00, '2023-06-30', 'novo_lead', 'Implementação de sistema de gestão para a prefeitura', '2023-01-15 10:30:00', '2023-01-15 10:30:00'),
    ('2', 'Plataforma de Educação Online', 'c2', 'r2', 280000.00, '2023-07-15', 'agendamento_reuniao', 'Desenvolvimento de plataforma educacional', '2023-02-10 14:20:00', '2023-02-15 09:45:00'),
    ('3', 'Modernização de Infraestrutura', 'c3', 'r1', 620000.00, '2023-08-10', 'levantamento_oportunidades', 'Projeto de modernização da infraestrutura de TI', '2023-03-05 11:15:00', '2023-03-10 16:30:00'),
    ('4', 'Sistema de Controle de Frotas', 'c4', 'r3', 180000.00, '2023-06-05', 'proposta_enviada', 'Sistema para gerenciamento de frotas de veículos', '2023-04-12 09:00:00', '2023-04-20 14:45:00'),
    ('5', 'Portal de Transparência', 'c5', 'r2', 320000.00, '2023-07-20', 'negociacao', 'Implementação de portal de transparência governamental', '2023-05-08 10:30:00', '2023-05-15 11:20:00'),
    ('6', 'Aplicativo de Serviços Públicos', 'c6', 'r3', 250000.00, '2023-06-15', 'fechado_ganho', 'Desenvolvimento de aplicativo para serviços públicos', '2023-01-20 13:45:00', '2023-02-28 16:30:00'),
    ('7', 'Sistema de Gestão Hospitalar', 'c7', 'r4', 380000.00, '2023-07-22', 'fechado_perdido', 'Sistema integrado para gestão hospitalar', '2023-03-15 09:30:00', '2023-04-10 14:20:00');

-- Inserção de notas
INSERT INTO notas (id, oportunidade_id, responsavel_id, conteudo, data_criacao)
VALUES
    ('n1', '1', 'r1', 'Cliente demonstrou interesse no módulo financeiro', '2023-01-16 11:30:00'),
    ('n2', '1', 'r1', 'Agendada apresentação para a próxima semana', '2023-01-18 14:45:00'),
    ('n3', '2', 'r2', 'Cliente solicitou demonstração da plataforma', '2023-02-12 10:15:00'),
    ('n4', '3', 'r1', 'Levantamento inicial de requisitos concluído', '2023-03-07 09:30:00'),
    ('n5', '4', 'r3', 'Proposta enviada, aguardando feedback', '2023-04-21 16:20:00'),
    ('n6', '5', 'r2', 'Em negociação de valores e prazos', '2023-05-16 13:40:00'),
    ('n7', '6', 'r3', 'Contrato assinado, projeto iniciado', '2023-03-01 10:00:00'),
    ('n8', '7', 'r4', 'Cliente optou por solução do concorrente', '2023-04-11 15:30:00');

-- Inserção de reuniões
INSERT INTO reunioes (id, oportunidade_id, titulo, descricao, data_hora, local, participantes, concluida, data_criacao, data_atualizacao)
VALUES
    ('m1', '1', 'Apresentação Inicial', 'Apresentação da solução para o cliente', '2023-01-25 14:00:00', 'Sede do Cliente', 'Ana Silva, João Silva, Equipe de TI', TRUE, '2023-01-17 09:30:00', '2023-01-26 10:00:00'),
    ('m2', '1', 'Levantamento de Requisitos', 'Reunião para levantar requisitos detalhados', '2023-02-05 10:00:00', 'Virtual - Teams', 'Ana Silva, João Silva, Equipe de TI', FALSE, '2023-01-26 11:45:00', '2023-01-26 11:45:00'),
    ('m3', '2', 'Demonstração da Plataforma', 'Demo das funcionalidades da plataforma', '2023-02-20 15:30:00', 'Escritório da Empresa', 'Carlos Oliveira, Maria Oliveira, Diretoria', TRUE, '2023-02-13 14:20:00', '2023-02-21 09:15:00'),
    ('m4', '3', 'Análise de Infraestrutura', 'Avaliação da infraestrutura atual', '2023-03-15 09:00:00', 'Hospital Municipal', 'Ana Silva, Pedro Santos, Equipe Técnica', TRUE, '2023-03-08 16:30:00', '2023-03-16 08:45:00'),
    ('m5', '4', 'Apresentação da Proposta', 'Apresentação detalhada da proposta comercial', '2023-04-25 11:00:00', 'Virtual - Zoom', 'Pedro Santos, Ana Costa, Diretoria', FALSE, '2023-04-22 10:15:00', '2023-04-22 10:15:00'),
    ('m6', '5', 'Negociação de Contrato', 'Discussão dos termos contratuais', '2023-05-22 14:00:00', 'Escritório da Empresa', 'Carlos Oliveira, Carlos Ferreira, Jurídico', FALSE, '2023-05-17 11:30:00', '2023-05-17 11:30:00'),
    ('m7', '6', 'Kickoff do Projeto', 'Início oficial do projeto', '2023-03-05 10:00:00', 'Prefeitura de Campinas', 'Pedro Santos, Lucia Mendes, Equipe de Projeto', TRUE, '2023-03-02 09:00:00', '2023-03-06 14:30:00'),
    ('m8', '7', 'Reunião de Encerramento', 'Formalização do encerramento da oportunidade', '2023-04-15 16:00:00', 'Virtual - Teams', 'Maria Souza, Roberto Alves, Diretoria', TRUE, '2023-04-12 13:45:00', '2023-04-16 09:20:00');
