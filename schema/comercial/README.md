# Esquema de Banco de Dados - Módulo Comercial

Este diretório contém os scripts SQL necessários para criar e configurar o banco de dados para o módulo comercial do CRM de Licitações.

## Arquivos

1. **01_create_tables.sql**: Criação das tabelas principais (clientes, responsáveis, oportunidades, notas, reuniões) e seus índices.

2. **02_insert_initial_data.sql**: Dados iniciais para teste e demonstração do sistema.

3. **03_queries.sql**: Consultas SQL para as principais funcionalidades do módulo comercial, incluindo listagem, filtros e estatísticas.

4. **04_procedures.sql**: Stored procedures para operações comuns como atualização de status, marcação de reuniões e geração de relatórios.

5. **05_triggers.sql**: Triggers para manter a integridade dos dados e registrar alterações importantes.

## Estrutura do Banco de Dados

### Tabelas Principais

- **clientes**: Armazena informações dos clientes
- **responsaveis**: Armazena informações dos responsáveis pelas oportunidades
- **oportunidades**: Armazena as oportunidades comerciais
- **notas**: Armazena anotações relacionadas às oportunidades
- **reunioes**: Armazena informações sobre reuniões relacionadas às oportunidades

### Tabelas Auxiliares

- **log_alteracoes_status**: Registra histórico de alterações de status das oportunidades

## Como Usar

Para configurar o banco de dados, execute os scripts na seguinte ordem:

1. `01_create_tables.sql`
2. `05_triggers.sql` (para criar a tabela de log e triggers)
3. `02_insert_initial_data.sql` (opcional, apenas para dados de teste)
4. `04_procedures.sql`

As consultas em `03_queries.sql` servem como referência para implementação das APIs do backend.

## Integração com o Backend

Os scripts SQL fornecidos são compatíveis com MySQL/MariaDB. Para integração com o backend Next.js:

1. Configure um cliente SQL no backend (recomendamos usar Prisma ORM ou similar)
2. Implemente as consultas nas rotas da API
3. Utilize as stored procedures para operações complexas

## Manutenção

Para manter o banco de dados:

- Faça backup regularmente
- Monitore o crescimento das tabelas
- Considere implementar particionamento para tabelas que crescem muito (como notas e log_alteracoes_status)
- Revise e otimize consultas conforme necessário
