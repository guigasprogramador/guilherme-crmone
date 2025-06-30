# Configuração do Azure MySQL

Este documento explica como migrar o banco de dados para o Azure MySQL.

## Configuração Atual

O sistema está configurado para usar variáveis de ambiente flexíveis que facilitam a migração para diferentes ambientes.

### Variáveis de Ambiente do Banco de Dados

- `DB_HOST`: Host do servidor MySQL
- `DB_USER`: Usuário do banco de dados
- `DB_PASSWORD`: Senha do banco de dados
- `DB_NAME`: Nome do banco de dados
- `DB_PORT`: Porta do MySQL (padrão: 3306)

## Migração para Azure MySQL

### 1. Criar o Banco de Dados no Azure

1. Acesse o Portal do Azure
2. Crie um novo "Azure Database for MySQL"
3. Configure:
   - **Nome do servidor**: `seu-servidor-mysql`
   - **Nome do banco**: `oneflowcrm`
   - **Usuário administrador**: `seu-usuario`
   - **Senha**: `sua-senha-segura`

### 2. Configurar Variáveis de Ambiente

Atualize as seguintes variáveis no seu ambiente de produção:

```bash
# Azure MySQL Configuration
DB_HOST=seu-servidor-mysql.mysql.database.azure.com
DB_USER=seu-usuario@seu-servidor-mysql
DB_PASSWORD=sua-senha-segura
DB_NAME=oneflowcrm
DB_PORT=3306
```

### 3. Configuração do Docker Compose para Azure

Para usar com Azure, atualize o `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - DB_HOST=seu-servidor-mysql.mysql.database.azure.com
  - DB_USER=seu-usuario@seu-servidor-mysql
  - DB_PASSWORD=sua-senha-segura
  - DB_NAME=oneflowcrm
  - DB_PORT=3306
```

### 4. Migração dos Dados

1. **Exportar dados atuais**:
   ```bash
   mysqldump -h localhost -u root -p123456789 crmone-teste > backup.sql
   ```

2. **Importar para Azure**:
   ```bash
   mysql -h seu-servidor-mysql.mysql.database.azure.com -u seu-usuario@seu-servidor-mysql -p oneflowcrm < backup.sql
   ```

### 5. Configuração de Firewall

No Azure Portal:
1. Vá para seu servidor MySQL
2. Em "Connection security"
3. Adicione as regras de firewall necessárias
4. Habilite "Allow access to Azure services"

### 6. Teste da Conexão

Após a configuração, teste a conexão:

```bash
mysql -h seu-servidor-mysql.mysql.database.azure.com -u seu-usuario@seu-servidor-mysql -p oneflowcrm
```

## Configuração SSL (Recomendado)

Para conexões seguras, adicione as configurações SSL:

```typescript
export const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456789',
  database: process.env.DB_NAME || 'crmone-teste',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};
```

## Rollback

Para voltar ao ambiente local, simplesmente restaure as variáveis originais:

```bash
DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=123456789
DB_NAME=crmone-teste
DB_PORT=3306
```

## Monitoramento

Após a migração, monitore:
- Performance das consultas
- Logs de conexão
- Métricas do Azure MySQL
- Alertas de disponibilidade