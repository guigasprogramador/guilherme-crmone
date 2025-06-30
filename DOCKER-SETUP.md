# Configuração Docker - Guia de Instalação

## Pré-requisitos

### Windows

1. **Instalar Docker Desktop**:
   - Baixe em: https://www.docker.com/products/docker-desktop/
   - Execute o instalador
   - Reinicie o computador se solicitado

2. **Verificar WSL2** (recomendado):
   - Abra PowerShell como administrador
   - Execute: `wsl --install`
   - Reinicie se necessário

3. **Iniciar Docker Desktop**:
   - Abra o Docker Desktop
   - Aguarde inicialização completa
   - Verifique se o ícone no system tray está verde

### Linux (Ubuntu/Debian)

```bash
# Atualizar pacotes
sudo apt update

# Instalar dependências
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker
```

### macOS

1. **Instalar Docker Desktop**:
   - Baixe em: https://www.docker.com/products/docker-desktop/
   - Arraste para Applications
   - Execute e siga as instruções

## Verificação da Instalação

```bash
# Verificar versão do Docker
docker --version

# Verificar versão do Docker Compose
docker compose version

# Testar instalação
docker run hello-world
```

## Primeiros Passos com o Projeto

1. **Configurar variáveis de ambiente**:
   ```bash
   cp .env.example .env.local
   # Edite .env.local com suas configurações
   ```

2. **Usar scripts de conveniência**:
   
   **Windows:**
   ```cmd
   docker-scripts.bat help
   docker-scripts.bat build
   docker-scripts.bat start
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x docker-scripts.sh
   ./docker-scripts.sh help
   ./docker-scripts.sh build
   ./docker-scripts.sh start
   ```

3. **Ou usar comandos manuais**:
   ```bash
   # Build e start
   docker-compose up --build
   
   # Para desenvolvimento
   docker-compose -f docker-compose.dev.yml up --build
   ```

## Solução de Problemas

### Docker Desktop não inicia (Windows)

1. Verificar se a virtualização está habilitada na BIOS
2. Verificar se o Hyper-V está habilitado:
   - Painel de Controle > Programas > Recursos do Windows
   - Marcar "Hyper-V"
3. Verificar se o WSL2 está instalado e atualizado

### Erro de permissão (Linux)

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker
```

### Porta já em uso

```bash
# Verificar processos usando a porta
netstat -tulpn | grep :3000

# Parar containers
docker-compose down

# Ou alterar porta no docker-compose.yml
```

### Limpar cache do Docker

```bash
# Limpar imagens não utilizadas
docker image prune

# Limpar tudo (cuidado!)
docker system prune -a
```

## Recursos Úteis

- [Documentação oficial do Docker](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Best Practices for Docker](https://docs.docker.com/develop/best-practices/)

## Comandos Essenciais

```bash
# Listar containers
docker ps

# Listar imagens
docker images

# Ver logs
docker logs <container_name>

# Entrar no container
docker exec -it <container_name> sh

# Parar todos os containers
docker stop $(docker ps -q)

# Remover containers parados
docker container prune
```