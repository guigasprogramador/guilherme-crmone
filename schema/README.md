# Esquemas do Banco de Dados - OneCRM

Este diretório contém os scripts SQL para criação e manutenção das estruturas de banco de dados do sistema OneCRM.

## Arquivos

- `auth-schema.sql`: Esquema para autenticação e autorização de usuários.
- `documentos-categorias.sql`: Scripts para adicionar e gerenciar categorias múltiplas (tags) para documentos.
- `documentos-schema-completo.sql`: Estrutura completa da tabela de documentos, incluindo categorias, índices e funções auxiliares.

## Como usar

### Para migrar categorias para array

Se você já tem documentos com categoria única e deseja migrar para o sistema de múltiplas categorias:

```sql
-- Adiciona a coluna categorias como array
ALTER TABLE crmonefactory.documentos 
ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Migra dados da coluna categoria para o array categorias
UPDATE crmonefactory.documentos 
SET categorias = ARRAY[categoria]
WHERE categorias IS NULL OR array_length(categorias, 1) IS NULL;
```

### Consultas úteis para categorias

Para buscar documentos com tag específica:
```sql
-- Buscar todos documentos com a tag 'licitacao'
SELECT * FROM crmonefactory.documentos 
WHERE 'licitacao' = ANY (categorias);
```

Para buscar documentos com qualquer uma das tags (OR):
```sql
-- Buscar documentos que tenham 'licitacao' OU 'comercial'
SELECT * FROM crmonefactory.documentos 
WHERE categorias && ARRAY['licitacao', 'comercial'];
```

Para buscar documentos com todas as tags (AND):
```sql
-- Buscar documentos que tenham 'licitacao' E 'comercial'
SELECT * FROM crmonefactory.documentos 
WHERE categorias @> ARRAY['licitacao', 'comercial'];
```

## Observações importantes

- Mantenha a coluna `categoria` (singular) enquanto o backend estiver em transição
- Use os índices GIN para otimizar consultas em arrays
- Consulte a documentação do Supabase/PostgreSQL para mais informações sobre operadores de array
