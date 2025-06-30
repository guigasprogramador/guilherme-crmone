# Docker Setup para CRM Project

Este projeto foi configurado para rodar com Docker, facilitando o desenvolvimento e deployment.

## Pré-requisitos

- Docker Desktop instalado
- Docker Compose (incluído no Docker Desktop)

## Estrutura dos Arquivos Docker

- `Dockerfile` - Configuração da imagem da aplicação Next.js
- `docker-compose.yml` - Orquestração dos serviços (app, MySQL, phpMyAdmin)
- `.dockerignore` - Arquivos ignorados durante o build

## Como usar

### 1. Configuração das Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o arquivo com suas configurações
# No Windows: notepad .env.local
# No Linux/Mac: nano .env.local
```

O arquivo `.env.example` contém todas as variáveis necessárias com valores de exemplo.

### 2. Scripts de Conveniência

Foram criados scripts para facilitar o uso do Docker:

**Windows:**
```cmd
# Usar o script batch
docker-scripts.bat help
docker-scripts.bat build
docker-scripts.bat start
docker-scripts.bat dev
```

**Linux/Mac:**
```bash
# Tornar o script executável (apenas uma vez)
chmod +x docker-scripts.sh

# Usar o script
./docker-scripts.sh help
./docker-scripts.sh build
./docker-scripts.sh start
./docker-scripts.sh dev
```

### 3. Build e Execução Manual com Docker Compose

```bash
# Build e start todos os serviços
docker-compose up --build

# Executar em background
docker-compose up -d --build

# Parar os serviços
docker-compose down

# Parar e remover volumes (cuidado: apaga dados do banco)
docker-compose down -v
```

### 4. Serviços Disponíveis

Após executar `docker-compose up`, os seguintes serviços estarão disponíveis:

- **Aplicação Next.js**: http://localhost:3000
- **MySQL Database**: localhost:3306
- **phpMyAdmin**: http://localhost:8080
  - Usuário: `root`
  - Senha: `password`

### 5. Desenvolvimento

Para desenvolvimento com hot reload, use:

```bash
# Com script de conveniência
docker-scripts.bat dev  # Windows
./docker-scripts.sh dev # Linux/Mac

# Ou manualmente
docker-compose -f docker-compose.dev.yml up --build
```

O ambiente de desenvolvimento monta o código como volume, permitindo hot reload.

### 6. Build apenas da aplicação

Se quiser buildar apenas a imagem da aplicação:

```bash
# Build da imagem
docker build -t crm-app .

# Executar apenas a aplicação (sem banco)
docker run -p 3000:3000 crm-app
```

### 7. Logs e Debugging

```bash
# Ver logs de todos os serviços
docker-compose logs

# Ver logs de um serviço específico
docker-compose logs app
docker-compose logs mysql

# Seguir logs em tempo real
docker-compose logs -f app
```

### 8. Comandos Úteis

```bash
# Listar containers rodando
docker ps

# Entrar no container da aplicação
docker-compose exec app sh

# Entrar no container do MySQL
docker-compose exec mysql mysql -u root -p

# Rebuild apenas um serviço
docker-compose up --build app

# Remover imagens não utilizadas
docker image prune
```

## Configurações de Produção

### Variáveis de Ambiente para Produção

Em produção, certifique-se de configurar:

1. **NEXTAUTH_SECRET**: Use um valor seguro e único
2. **DATABASE_URL**: Configure com suas credenciais reais do banco
3. **NEXTAUTH_URL**: Configure com sua URL de produção

### Segurança

- Altere as senhas padrão do MySQL
- Use secrets do Docker para informações sensíveis
- Configure SSL/TLS para conexões de banco
- Use um reverse proxy (nginx) em produção

### Performance

- Configure limites de memória e CPU nos containers
- Use volumes nomeados para persistência de dados
- Configure health checks

## Troubleshooting

### Problemas Comuns

1. **Porta já em uso**: Altere as portas no docker-compose.yml
2. **Erro de conexão com banco**: Verifique se o MySQL está rodando
3. **Build falha**: Limpe o cache do Docker: `docker system prune`

### Reset Completo

```bash
# Para resetar tudo (cuidado: apaga todos os dados)
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Estrutura Multi-stage do Dockerfile

O Dockerfile usa multi-stage build para otimização:

1. **deps**: Instala apenas as dependências
2. **builder**: Faz o build da aplicação
3. **runner**: Imagem final otimizada para produção

Isso resulta em uma imagem final menor e mais segura.