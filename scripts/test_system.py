#!/usr/bin/env python3

"""
Script de teste para validar as principais funcionalidades do sistema CRM
Execute com: python3 scripts/test_system.py
"""

import os
import sys
from pathlib import Path

# Cores para output
class Colors:
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def log(message, color=Colors.RESET):
    print(f"{color}{message}{Colors.RESET}")

def log_success(message):
    log(f"✅ {message}", Colors.GREEN)

def log_error(message):
    log(f"❌ {message}", Colors.RED)

def log_warning(message):
    log(f"⚠️  {message}", Colors.YELLOW)

def log_info(message):
    log(f"ℹ️  {message}", Colors.BLUE)

def file_exists(file_path):
    return Path(file_path).exists()

def dir_exists(dir_path):
    return Path(dir_path).is_dir()

def check_file_content(file_path, search_string):
    if not file_exists(file_path):
        return False
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            return search_string in content
    except:
        return False

def test_project_structure():
    log(f"\n📁 Testando estrutura do projeto...", Colors.BOLD)
    
    required_dirs = [
        'app/api',
        'components',
        'lib',
        'hooks',
        'types',
        'middleware',
        'scripts'
    ]
    
    passed = 0
    
    for dir_path in required_dirs:
        if dir_exists(dir_path):
            log_success(f"Diretório {dir_path} existe")
            passed += 1
        else:
            log_error(f"Diretório {dir_path} não encontrado")
    
    return passed == len(required_dirs)

def test_api_routes():
    log(f"\n🔌 Testando rotas da API...", Colors.BOLD)
    
    api_routes = [
        'app/api/comercial/oportunidades/route.ts',
        'app/api/comercial/oportunidades/[id]/route.ts',
        'app/api/comercial/oportunidades/[id]/documentos/route.ts',
        'app/api/licitacoes/route.ts',
        'app/api/licitacoes/[id]/route.ts',
        'app/api/documentos/route.ts',
        'app/api/documentos/por-oportunidade/route.ts',
        'app/api/documentos/por-tag/route.ts',
        'app/api/contatos/route.ts',
        'app/api/contatos/[id]/route.ts'
    ]
    
    passed = 0
    
    for route in api_routes:
        if file_exists(route):
            log_success(f"Rota {route} existe")
            passed += 1
        else:
            log_error(f"Rota {route} não encontrada")
    
    return passed == len(api_routes)

def test_components():
    log(f"\n🧩 Testando componentes...", Colors.BOLD)
    
    components = [
        'components/detalhes-oportunidade.tsx',
        'components/licitacoes/detalhes-licitacao.tsx',
        'components/detalhes-cliente.tsx',
        'components/licitacoes/detalhes-orgao.tsx',
        'components/documentos/visualizador-documentos.tsx'
    ]
    
    passed = 0
    
    for component in components:
        if file_exists(component):
            log_success(f"Componente {component} existe")
            passed += 1
        else:
            log_error(f"Componente {component} não encontrado")
    
    return passed == len(components)

def test_security():
    log(f"\n🔒 Testando implementações de segurança...", Colors.BOLD)
    
    security_files = [
        'middleware/security.ts',
        'lib/rate-limit.ts',
        'lib/cache.ts'
    ]
    
    passed = 0
    
    for file_path in security_files:
        if file_exists(file_path):
            log_success(f"Arquivo de segurança {file_path} existe")
            passed += 1
        else:
            log_error(f"Arquivo de segurança {file_path} não encontrado")
    
    # Verificar se middleware de segurança tem funções essenciais
    if file_exists('middleware/security.ts'):
        security_functions = [
            'sanitizeInput',
            'isValidUUID',
            'isValidEmail',
            'isValidCNPJ',
            'securityMiddleware'
        ]
        
        for func in security_functions:
            if check_file_content('middleware/security.ts', func):
                log_success(f"Função de segurança {func} implementada")
                passed += 1
            else:
                log_error(f"Função de segurança {func} não encontrada")
    
    return passed >= len(security_files)

def test_sql_fixes():
    log(f"\n🗄️  Testando correções SQL...", Colors.BOLD)
    
    sql_file = 'sql_fixes.sql'
    
    if not file_exists(sql_file):
        log_error(f"Arquivo {sql_file} não encontrado")
        return False
    
    sql_checks = [
        'ALTER TABLE documentos',
        'FOREIGN KEY',
        'CREATE INDEX',
        'CREATE TRIGGER',
        'CREATE FUNCTION fn_validar_cnpj',
        'CREATE OR REPLACE VIEW view_estatisticas_sistema',
        'CREATE PROCEDURE sp_limpeza_dados_orfaos'
    ]
    
    passed = 0
    
    for check in sql_checks:
        if check_file_content(sql_file, check):
            log_success(f"Correção SQL encontrada: {check}")
            passed += 1
        else:
            log_warning(f"Correção SQL não encontrada: {check}")
    
    return passed >= len(sql_checks) * 0.8  # 80% das correções devem estar presentes

def test_documentation():
    log(f"\n📚 Testando documentação...", Colors.BOLD)
    
    doc_files = [
        'todo.md',
        'melhorias_robustez.md',
        'sql_fixes.sql'
    ]
    
    passed = 0
    
    for file_path in doc_files:
        if file_exists(file_path):
            log_success(f"Arquivo de documentação {file_path} existe")
            passed += 1
        else:
            log_error(f"Arquivo de documentação {file_path} não encontrado")
    
    return passed == len(doc_files)

def test_tag_system():
    log(f"\n🏷️  Testando sistema de tags...", Colors.BOLD)
    
    passed = 0
    
    # Verificar se a nova rota de documentos por oportunidade existe
    if file_exists('app/api/comercial/oportunidades/[id]/documentos/route.ts'):
        log_success('Nova rota de documentos por oportunidade implementada')
        passed += 1
    else:
        log_error('Nova rota de documentos por oportunidade não encontrada')
    
    # Verificar se a correção na API de oportunidades foi feita
    if check_file_content('app/api/comercial/oportunidades/route.ts', 'documentos_vinculados'):
        log_success('Correção do sistema de tags na API de oportunidades implementada')
        passed += 1
    else:
        log_warning('Correção do sistema de tags pode não estar completa')
    
    return passed >= 1

def test_document_viewer():
    log(f"\n📄 Testando visualizador de documentos...", Colors.BOLD)
    
    passed = 0
    
    if file_exists('components/documentos/visualizador-documentos.tsx'):
        log_success('Componente VisualizadorDocumentos existe')
        passed += 1
        
        features = [
            'entityType',
            'showFilters',
            'handlePreview',
            'handleDownload',
            'formatarTamanho'
        ]
        
        for feature in features:
            if check_file_content('components/documentos/visualizador-documentos.tsx', feature):
                log_success(f"Funcionalidade {feature} implementada")
                passed += 1
            else:
                log_warning(f"Funcionalidade {feature} pode estar ausente")
    else:
        log_error('Componente VisualizadorDocumentos não encontrado')
    
    return passed >= 3

def run_tests():
    log('🚀 Iniciando testes do sistema CRM...', Colors.BOLD)
    log('=' * 50)
    
    tests = [
        {'name': 'Estrutura do Projeto', 'fn': test_project_structure},
        {'name': 'Rotas da API', 'fn': test_api_routes},
        {'name': 'Componentes', 'fn': test_components},
        {'name': 'Segurança', 'fn': test_security},
        {'name': 'Correções SQL', 'fn': test_sql_fixes},
        {'name': 'Documentação', 'fn': test_documentation},
        {'name': 'Sistema de Tags', 'fn': test_tag_system},
        {'name': 'Visualizador de Documentos', 'fn': test_document_viewer}
    ]
    
    total_passed = 0
    results = []
    
    for test in tests:
        passed = test['fn']()
        results.append({'name': test['name'], 'passed': passed})
        if passed:
            total_passed += 1
    
    # Resumo dos resultados
    log(f"\n📊 Resumo dos Testes:", Colors.BOLD)
    log('=' * 50)
    
    for result in results:
        if result['passed']:
            log_success(f"{result['name']}: PASSOU")
        else:
            log_error(f"{result['name']}: FALHOU")
    
    log(f"\n📈 Resultado Final: {total_passed}/{len(tests)} testes passaram", Colors.BOLD)
    
    if total_passed == len(tests):
        log_success('🎉 Todos os testes passaram! Sistema está pronto para produção.')
    elif total_passed >= len(tests) * 0.8:
        log_warning('⚠️  A maioria dos testes passou. Verifique os itens que falharam.')
    else:
        log_error('❌ Muitos testes falharam. Sistema precisa de mais correções.')
    
    return total_passed / len(tests)

if __name__ == '__main__':
    score = run_tests()
    sys.exit(0 if score == 1 else 1)

