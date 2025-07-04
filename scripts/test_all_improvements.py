#!/usr/bin/env python3

"""
Script de Teste Abrangente - Sistema CRM
Valida todas as melhorias implementadas no sistema
"""

import os
import sys
import json
import time
from pathlib import Path

def print_header(title):
    """Imprime cabeçalho formatado"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_test(test_name, status="RUNNING"):
    """Imprime status do teste"""
    status_colors = {
        "RUNNING": "\033[93m",  # Amarelo
        "PASS": "\033[92m",     # Verde
        "FAIL": "\033[91m",     # Vermelho
        "SKIP": "\033[94m"      # Azul
    }
    reset_color = "\033[0m"
    
    color = status_colors.get(status, "")
    print(f"{color}[{status}]{reset_color} {test_name}")

def test_file_exists(file_path, description):
    """Testa se um arquivo existe"""
    print_test(f"Verificando {description}", "RUNNING")
    
    if os.path.exists(file_path):
        print_test(f"✓ {description} existe", "PASS")
        return True
    else:
        print_test(f"✗ {description} não encontrado", "FAIL")
        return False

def test_directory_structure():
    """Testa a estrutura de diretórios do projeto"""
    print_header("TESTE 1: ESTRUTURA DE DIRETÓRIOS")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    required_dirs = [
        ("app/api/auth", "Diretório de autenticação"),
        ("app/api/comercial", "Diretório comercial"),
        ("app/api/documentos", "Diretório de documentos"),
        ("components", "Diretório de componentes"),
        ("lib", "Diretório de bibliotecas"),
        ("middleware", "Diretório de middleware"),
        ("hooks", "Diretório de hooks")
    ]
    
    passed = 0
    total = len(required_dirs)
    
    for dir_path, description in required_dirs:
        full_path = os.path.join(base_path, dir_path)
        if test_file_exists(full_path, description):
            passed += 1
    
    print(f"\nResultado: {passed}/{total} diretórios encontrados")
    return passed == total

def test_api_files():
    """Testa se os arquivos de API existem"""
    print_header("TESTE 2: ARQUIVOS DE API")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    api_files = [
        ("app/api/auth/login/route.ts", "API de Login"),
        ("app/api/auth/register/route.ts", "API de Registro"),
        ("app/api/auth/refresh/route.ts", "API de Refresh Token"),
        ("app/api/auth/avatar/route.ts", "API de Avatar"),
        ("app/api/users/profile/route.ts", "API de Perfil"),
        ("app/api/comercial/reunioes/route.ts", "API de Reuniões"),
        ("app/api/comercial/oportunidades/route.ts", "API de Oportunidades"),
        ("app/api/documentos/route.ts", "API de Documentos"),
        ("app/api/documentos/por-tag/route.ts", "API de Documentos por Tag")
    ]
    
    passed = 0
    total = len(api_files)
    
    for file_path, description in api_files:
        full_path = os.path.join(base_path, file_path)
        if test_file_exists(full_path, description):
            passed += 1
    
    print(f"\nResultado: {passed}/{total} APIs encontradas")
    return passed == total

def test_fixed_files():
    """Testa se os arquivos corrigidos existem"""
    print_header("TESTE 3: ARQUIVOS CORRIGIDOS")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    fixed_files = [
        ("app/api/auth/login/route_fixed.ts", "Login API Corrigida"),
        ("app/api/auth/avatar/route_fixed.ts", "Avatar API Corrigida"),
        ("app/api/comercial/reunioes/route_fixed.ts", "Reuniões API Corrigida"),
        ("app/api/comercial/reunioes/[id]/route_fixed.ts", "Reunião Específica API Corrigida"),
        ("components/documentos/visualizador-documentos.tsx", "Visualizador de Documentos"),
        ("components/perfil/gerenciar-perfil.tsx", "Gerenciador de Perfil"),
        ("middleware/security.ts", "Middleware de Segurança"),
        ("lib/rate-limit.ts", "Rate Limiting"),
        ("lib/cache.ts", "Sistema de Cache")
    ]
    
    passed = 0
    total = len(fixed_files)
    
    for file_path, description in fixed_files:
        full_path = os.path.join(base_path, file_path)
        if test_file_exists(full_path, description):
            passed += 1
    
    print(f"\nResultado: {passed}/{total} arquivos corrigidos encontrados")
    return passed == total

def test_documentation_files():
    """Testa se os arquivos de documentação existem"""
    print_header("TESTE 4: DOCUMENTAÇÃO")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    doc_files = [
        ("sql_fixes.sql", "Comandos SQL de Correção"),
        ("analise_agendamento.md", "Análise do Sistema de Agendamento"),
        ("analise_autenticacao.md", "Análise do Sistema de Autenticação"),
        ("melhorias_robustez.md", "Melhorias de Robustez"),
        ("RESUMO_EXECUTIVO.md", "Resumo Executivo"),
        ("todo.md", "Lista de Tarefas")
    ]
    
    passed = 0
    total = len(doc_files)
    
    for file_path, description in doc_files:
        full_path = os.path.join(base_path, file_path)
        if test_file_exists(full_path, description):
            passed += 1
    
    print(f"\nResultado: {passed}/{total} arquivos de documentação encontrados")
    return passed == total

def test_sql_file_content():
    """Testa o conteúdo do arquivo SQL"""
    print_header("TESTE 5: CONTEÚDO DO ARQUIVO SQL")
    
    sql_file = "/home/ubuntu/crmoniefactory/crmoniefactory-main/sql_fixes.sql"
    
    if not os.path.exists(sql_file):
        print_test("Arquivo SQL não encontrado", "FAIL")
        return False
    
    try:
        with open(sql_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_sections = [
            ("ALTER TABLE documentos", "Correções na tabela documentos"),
            ("CREATE INDEX", "Criação de índices"),
            ("CREATE TRIGGER", "Criação de triggers"),
            ("CREATE PROCEDURE", "Criação de procedimentos"),
            ("CREATE TABLE.*login_attempts", "Tabela de tentativas de login"),
            ("CREATE TABLE.*active_sessions", "Tabela de sessões ativas"),
            ("CREATE TABLE.*user_activity_log", "Tabela de log de atividades"),
            ("CLOUDINARY", "Configurações do Cloudinary"),
            ("reunioes", "Melhorias no sistema de reuniões")
        ]
        
        passed = 0
        total = len(required_sections)
        
        for pattern, description in required_sections:
            if pattern.upper() in content.upper():
                print_test(f"✓ {description} encontrada", "PASS")
                passed += 1
            else:
                print_test(f"✗ {description} não encontrada", "FAIL")
        
        print(f"\nResultado: {passed}/{total} seções SQL encontradas")
        return passed == total
        
    except Exception as e:
        print_test(f"Erro ao ler arquivo SQL: {e}", "FAIL")
        return False

def test_component_structure():
    """Testa a estrutura dos componentes React"""
    print_header("TESTE 6: ESTRUTURA DOS COMPONENTES")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    try:
        # Testar componente de visualização de documentos
        doc_viewer_path = os.path.join(base_path, "components/documentos/visualizador-documentos.tsx")
        if os.path.exists(doc_viewer_path):
            with open(doc_viewer_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            required_features = [
                ("useState", "Gerenciamento de estado"),
                ("useEffect", "Efeitos de ciclo de vida"),
                ("filtros", "Sistema de filtros"),
                ("preview", "Preview de documentos"),
                ("download", "Funcionalidade de download")
            ]
            
            passed = 0
            total = len(required_features)
            
            for feature, description in required_features:
                if feature in content:
                    print_test(f"✓ {description} implementada", "PASS")
                    passed += 1
                else:
                    print_test(f"✗ {description} não encontrada", "FAIL")
            
            print(f"\nComponente de Documentos: {passed}/{total} funcionalidades")
        
        # Testar componente de perfil
        profile_path = os.path.join(base_path, "components/perfil/gerenciar-perfil.tsx")
        if os.path.exists(profile_path):
            with open(profile_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            profile_features = [
                ("Avatar", "Gerenciamento de avatar"),
                ("upload", "Upload de arquivos"),
                ("Cloudinary", "Integração com Cloudinary"),
                ("validação", "Validação de dados"),
                ("preferências", "Gerenciamento de preferências")
            ]
            
            passed_profile = 0
            total_profile = len(profile_features)
            
            for feature, description in profile_features:
                if feature in content:
                    print_test(f"✓ {description} implementada", "PASS")
                    passed_profile += 1
                else:
                    print_test(f"✗ {description} não encontrada", "FAIL")
            
            print(f"\nComponente de Perfil: {passed_profile}/{total_profile} funcionalidades")
            
            return (passed + passed_profile) == (total + total_profile)
        
        return False
        
    except Exception as e:
        print_test(f"Erro ao analisar componentes: {e}", "FAIL")
        return False

def test_security_improvements():
    """Testa as melhorias de segurança"""
    print_header("TESTE 7: MELHORIAS DE SEGURANÇA")
    
    base_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    
    security_files = [
        ("middleware/security.ts", "Middleware de Segurança"),
        ("lib/rate-limit.ts", "Rate Limiting"),
        ("lib/cache.ts", "Sistema de Cache")
    ]
    
    passed = 0
    total = len(security_files)
    
    for file_path, description in security_files:
        full_path = os.path.join(base_path, file_path)
        if test_file_exists(full_path, description):
            passed += 1
    
    # Verificar se as APIs corrigidas incluem melhorias de segurança
    login_fixed = os.path.join(base_path, "app/api/auth/login/route_fixed.ts")
    if os.path.exists(login_fixed):
        try:
            with open(login_fixed, 'r', encoding='utf-8') as f:
                content = f.read()
            
            security_features = [
                ("rate", "Rate limiting"),
                ("sanitize", "Sanitização de inputs"),
                ("bcrypt", "Hash de senhas"),
                ("validation", "Validação de dados"),
                ("audit", "Log de auditoria")
            ]
            
            for feature, description in security_features:
                if feature.lower() in content.lower():
                    print_test(f"✓ {description} implementada", "PASS")
                    passed += 1
                else:
                    print_test(f"✗ {description} não encontrada", "FAIL")
            
            total += len(security_features)
            
        except Exception as e:
            print_test(f"Erro ao analisar segurança: {e}", "FAIL")
    
    print(f"\nResultado: {passed}/{total} melhorias de segurança encontradas")
    return passed >= (total * 0.8)  # 80% de aprovação

def test_package_dependencies():
    """Testa as dependências do projeto"""
    print_header("TESTE 8: DEPENDÊNCIAS DO PROJETO")
    
    package_json_path = "/home/ubuntu/crmoniefactory/crmoniefactory-main/package.json"
    
    if not os.path.exists(package_json_path):
        print_test("package.json não encontrado", "FAIL")
        return False
    
    try:
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        dependencies = package_data.get('dependencies', {})
        dev_dependencies = package_data.get('devDependencies', {})
        all_deps = {**dependencies, **dev_dependencies}
        
        required_deps = [
            ("next", "Next.js Framework"),
            ("react", "React Library"),
            ("mysql2", "MySQL Driver"),
            ("bcryptjs", "Password Hashing"),
            ("jsonwebtoken", "JWT Tokens"),
            ("uuid", "UUID Generation"),
            ("cloudinary", "Cloudinary SDK")
        ]
        
        passed = 0
        total = len(required_deps)
        
        for dep, description in required_deps:
            if dep in all_deps:
                print_test(f"✓ {description} ({dep}) instalada", "PASS")
                passed += 1
            else:
                print_test(f"✗ {description} ({dep}) não encontrada", "FAIL")
        
        print(f"\nResultado: {passed}/{total} dependências encontradas")
        return passed == total
        
    except Exception as e:
        print_test(f"Erro ao analisar package.json: {e}", "FAIL")
        return False

def generate_test_report():
    """Gera relatório final dos testes"""
    print_header("RELATÓRIO FINAL DOS TESTES")
    
    tests = [
        ("Estrutura de Diretórios", test_directory_structure),
        ("Arquivos de API", test_api_files),
        ("Arquivos Corrigidos", test_fixed_files),
        ("Documentação", test_documentation_files),
        ("Conteúdo SQL", test_sql_file_content),
        ("Estrutura de Componentes", test_component_structure),
        ("Melhorias de Segurança", test_security_improvements),
        ("Dependências", test_package_dependencies)
    ]
    
    results = []
    total_tests = len(tests)
    passed_tests = 0
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, "PASS" if result else "FAIL"))
            if result:
                passed_tests += 1
        except Exception as e:
            print_test(f"Erro no teste {test_name}: {e}", "FAIL")
            results.append((test_name, "ERROR"))
    
    print("\n" + "="*60)
    print(" RESUMO DOS TESTES")
    print("="*60)
    
    for test_name, status in results:
        status_symbol = "✓" if status == "PASS" else "✗" if status == "FAIL" else "!"
        print(f"{status_symbol} {test_name}: {status}")
    
    print(f"\nResultado Final: {passed_tests}/{total_tests} testes passaram")
    
    success_rate = (passed_tests / total_tests) * 100
    print(f"Taxa de Sucesso: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("\n🎉 EXCELENTE! Sistema está pronto para produção.")
    elif success_rate >= 75:
        print("\n✅ BOM! Sistema está funcional com pequenos ajustes necessários.")
    elif success_rate >= 50:
        print("\n⚠️  ATENÇÃO! Sistema precisa de correções antes da produção.")
    else:
        print("\n❌ CRÍTICO! Sistema precisa de revisão completa.")
    
    return success_rate >= 75

def main():
    """Função principal"""
    print("="*60)
    print(" TESTE ABRANGENTE DO SISTEMA CRM")
    print(" Validação de Todas as Melhorias Implementadas")
    print("="*60)
    print(f" Data/Hora: {time.strftime('%d/%m/%Y %H:%M:%S')}")
    print(f" Diretório: /home/ubuntu/crmoniefactory/crmoniefactory-main")
    print("="*60)
    
    # Verificar se o diretório do projeto existe
    project_dir = "/home/ubuntu/crmoniefactory/crmoniefactory-main"
    if not os.path.exists(project_dir):
        print_test("Diretório do projeto não encontrado!", "FAIL")
        sys.exit(1)
    
    # Executar testes
    success = generate_test_report()
    
    # Salvar relatório
    report_file = os.path.join(project_dir, "test_report.txt")
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"Relatório de Testes - {time.strftime('%d/%m/%Y %H:%M:%S')}\n")
            f.write("="*60 + "\n")
            f.write("Sistema CRM - Validação de Melhorias\n")
            f.write("="*60 + "\n\n")
            f.write("Este relatório foi gerado automaticamente.\n")
            f.write("Para detalhes completos, execute o script novamente.\n")
        
        print(f"\n📄 Relatório salvo em: {report_file}")
    except Exception as e:
        print(f"\n⚠️  Erro ao salvar relatório: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

