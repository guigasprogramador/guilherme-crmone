@echo off
REM Script de conveniência para Docker no Windows

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="build" goto build
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="dev" goto dev
if "%1"=="logs" goto logs
if "%1"=="clean" goto clean
if "%1"=="reset" goto reset

:help
echo.
echo Comandos disponíveis:
echo.
echo   build    - Build da aplicação para produção
echo   start    - Inicia os serviços em produção
echo   stop     - Para todos os serviços
echo   dev      - Inicia ambiente de desenvolvimento
echo   logs     - Mostra logs dos serviços
echo   clean    - Limpa imagens não utilizadas
echo   reset    - Reset completo (CUIDADO: apaga dados)
echo.
goto end

:build
echo Fazendo build da aplicação...
docker-compose build
goto end

:start
echo Iniciando serviços em produção...
docker-compose up -d
echo.
echo Serviços disponíveis:
echo - Aplicação: http://localhost:3000
echo - phpMyAdmin: http://localhost:8080
echo.
goto end

:stop
echo Parando todos os serviços...
docker-compose down
goto end

:dev
echo Iniciando ambiente de desenvolvimento...
docker-compose -f docker-compose.dev.yml up --build
goto end

:logs
echo Mostrando logs...
docker-compose logs -f
goto end

:clean
echo Limpando imagens não utilizadas...
docker image prune -f
echo Limpeza concluída.
goto end

:reset
echo ATENÇÃO: Isso irá apagar todos os dados do banco!
set /p confirm="Tem certeza? (s/N): "
if /i "%confirm%"=="s" (
    echo Fazendo reset completo...
    docker-compose down -v
    docker system prune -a -f
    echo Reset concluído.
) else (
    echo Operação cancelada.
)
goto end

:end