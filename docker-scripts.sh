#!/bin/bash

# Script de conveniência para Docker

set -e

show_help() {
    echo ""
    echo "Comandos disponíveis:"
    echo ""
    echo "  build    - Build da aplicação para produção"
    echo "  start    - Inicia os serviços em produção"
    echo "  stop     - Para todos os serviços"
    echo "  dev      - Inicia ambiente de desenvolvimento"
    echo "  logs     - Mostra logs dos serviços"
    echo "  clean    - Limpa imagens não utilizadas"
    echo "  reset    - Reset completo (CUIDADO: apaga dados)"
    echo ""
}

build_app() {
    echo "Fazendo build da aplicação..."
    docker-compose build
}

start_prod() {
    echo "Iniciando serviços em produção..."
    docker-compose up -d
    echo ""
    echo "Serviços disponíveis:"
    echo "- Aplicação: http://localhost:3000"
    echo "- phpMyAdmin: http://localhost:8080"
    echo ""
}

stop_services() {
    echo "Parando todos os serviços..."
    docker-compose down
}

start_dev() {
    echo "Iniciando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml up --build
}

show_logs() {
    echo "Mostrando logs..."
    docker-compose logs -f
}

clean_images() {
    echo "Limpando imagens não utilizadas..."
    docker image prune -f
    echo "Limpeza concluída."
}

reset_all() {
    echo "ATENÇÃO: Isso irá apagar todos os dados do banco!"
    read -p "Tem certeza? (s/N): " confirm
    if [[ $confirm == [sS] || $confirm == [sS][iI][mM] ]]; then
        echo "Fazendo reset completo..."
        docker-compose down -v
        docker system prune -a -f
        echo "Reset concluído."
    else
        echo "Operação cancelada."
    fi
}

case "$1" in
    build)
        build_app
        ;;
    start)
        start_prod
        ;;
    stop)
        stop_services
        ;;
    dev)
        start_dev
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_images
        ;;
    reset)
        reset_all
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "Comando inválido: $1"
        show_help
        exit 1
        ;;
esac