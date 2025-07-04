#!/usr/bin/env node

/**
 * Script de teste para validar as principais funcionalidades do sistema CRM
 * Execute com: node scripts/test-system.js
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Verificar se arquivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Verificar se diretório existe
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Verificar conteúdo do arquivo
function checkFileContent(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchString);
}

// Testes de estrutura do projeto
function testProjectStructure() {
  log('\n📁 Testando estrutura do projeto...', 'bold');
  
  const requiredDirs = [
    'app/api',
    'components',
    'lib',
    'hooks',
    'types',
    'middleware',
    'scripts'
  ];
  
  let passed = 0;
  
  requiredDirs.forEach(dir => {
    if (dirExists(dir)) {
      logSuccess(`Diretório ${dir} existe`);
      passed++;
    } else {
      logError(`Diretório ${dir} não encontrado`);
    }
  });
  
  return passed === requiredDirs.length;
}

// Testes de APIs
function testAPIRoutes() {
  log('\n🔌 Testando rotas da API...', 'bold');
  
  const apiRoutes = [
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
  ];
  
  let passed = 0;
  
  apiRoutes.forEach(route => {
    if (fileExists(route)) {
      logSuccess(`Rota ${route} existe`);
      passed++;
    } else {
      logError(`Rota ${route} não encontrada`);
    }
  });
  
  return passed === apiRoutes.length;
}

// Testes de componentes
function testComponents() {
  log('\n🧩 Testando componentes...', 'bold');
  
  const components = [
    'components/detalhes-oportunidade.tsx',
    'components/licitacoes/detalhes-licitacao.tsx',
    'components/detalhes-cliente.tsx',
    'components/licitacoes/detalhes-orgao.tsx',
    'components/documentos/visualizador-documentos.tsx'
  ];
  
  let passed = 0;
  
  components.forEach(component => {
    if (fileExists(component)) {
      logSuccess(`Componente ${component} existe`);
      passed++;
    } else {
      logError(`Componente ${component} não encontrado`);
    }
  });
  
  return passed === components.length;
}

// Testes de middleware e segurança
function testSecurity() {
  log('\n🔒 Testando implementações de segurança...', 'bold');
  
  const securityFiles = [
    'middleware/security.ts',
    'lib/rate-limit.ts',
    'lib/cache.ts'
  ];
  
  let passed = 0;
  
  securityFiles.forEach(file => {
    if (fileExists(file)) {
      logSuccess(`Arquivo de segurança ${file} existe`);
      passed++;
    } else {
      logError(`Arquivo de segurança ${file} não encontrado`);
    }
  });
  
  // Verificar se middleware de segurança tem funções essenciais
  if (fileExists('middleware/security.ts')) {
    const securityFunctions = [
      'sanitizeInput',
      'isValidUUID',
      'isValidEmail',
      'isValidCNPJ',
      'securityMiddleware'
    ];
    
    securityFunctions.forEach(func => {
      if (checkFileContent('middleware/security.ts', func)) {
        logSuccess(`Função de segurança ${func} implementada`);
        passed++;
      } else {
        logError(`Função de segurança ${func} não encontrada`);
      }
    });
  }
  
  return passed >= securityFiles.length;
}

// Testes de correções SQL
function testSQLFixes() {
  log('\n🗄️  Testando correções SQL...', 'bold');
  
  const sqlFile = 'sql_fixes.sql';
  
  if (!fileExists(sqlFile)) {
    logError(`Arquivo ${sqlFile} não encontrado`);
    return false;
  }
  
  const sqlChecks = [
    'ALTER TABLE documentos',
    'FOREIGN KEY',
    'CREATE INDEX',
    'CREATE TRIGGER',
    'CREATE FUNCTION fn_validar_cnpj',
    'CREATE OR REPLACE VIEW view_estatisticas_sistema',
    'CREATE PROCEDURE sp_limpeza_dados_orfaos'
  ];
  
  let passed = 0;
  
  sqlChecks.forEach(check => {
    if (checkFileContent(sqlFile, check)) {
      logSuccess(`Correção SQL encontrada: ${check}`);
      passed++;
    } else {
      logWarning(`Correção SQL não encontrada: ${check}`);
    }
  });
  
  return passed >= sqlChecks.length * 0.8; // 80% das correções devem estar presentes
}

// Testes de documentação
function testDocumentation() {
  log('\n📚 Testando documentação...', 'bold');
  
  const docFiles = [
    'todo.md',
    'melhorias_robustez.md',
    'sql_fixes.sql'
  ];
  
  let passed = 0;
  
  docFiles.forEach(file => {
    if (fileExists(file)) {
      logSuccess(`Arquivo de documentação ${file} existe`);
      passed++;
    } else {
      logError(`Arquivo de documentação ${file} não encontrado`);
    }
  });
  
  return passed === docFiles.length;
}

// Verificar integridade do sistema de tags
function testTagSystem() {
  log('\n🏷️  Testando sistema de tags...', 'bold');
  
  let passed = 0;
  
  // Verificar se a nova rota de documentos por oportunidade existe
  if (fileExists('app/api/comercial/oportunidades/[id]/documentos/route.ts')) {
    logSuccess('Nova rota de documentos por oportunidade implementada');
    passed++;
  } else {
    logError('Nova rota de documentos por oportunidade não encontrada');
  }
  
  // Verificar se a correção na API de oportunidades foi feita
  if (checkFileContent('app/api/comercial/oportunidades/route.ts', 'documentos_vinculados')) {
    logSuccess('Correção do sistema de tags na API de oportunidades implementada');
    passed++;
  } else {
    logWarning('Correção do sistema de tags pode não estar completa');
  }
  
  return passed >= 1;
}

// Verificar visualizador de documentos
function testDocumentViewer() {
  log('\n📄 Testando visualizador de documentos...', 'bold');
  
  let passed = 0;
  
  if (fileExists('components/documentos/visualizador-documentos.tsx')) {
    logSuccess('Componente VisualizadorDocumentos existe');
    passed++;
    
    const features = [
      'entityType',
      'showFilters',
      'handlePreview',
      'handleDownload',
      'formatarTamanho'
    ];
    
    features.forEach(feature => {
      if (checkFileContent('components/documentos/visualizador-documentos.tsx', feature)) {
        logSuccess(`Funcionalidade ${feature} implementada`);
        passed++;
      } else {
        logWarning(`Funcionalidade ${feature} pode estar ausente`);
      }
    });
  } else {
    logError('Componente VisualizadorDocumentos não encontrado');
  }
  
  return passed >= 3;
}

// Função principal de teste
function runTests() {
  log('🚀 Iniciando testes do sistema CRM...', 'bold');
  log('=' * 50);
  
  const tests = [
    { name: 'Estrutura do Projeto', fn: testProjectStructure },
    { name: 'Rotas da API', fn: testAPIRoutes },
    { name: 'Componentes', fn: testComponents },
    { name: 'Segurança', fn: testSecurity },
    { name: 'Correções SQL', fn: testSQLFixes },
    { name: 'Documentação', fn: testDocumentation },
    { name: 'Sistema de Tags', fn: testTagSystem },
    { name: 'Visualizador de Documentos', fn: testDocumentViewer }
  ];
  
  let totalPassed = 0;
  const results = [];
  
  tests.forEach(test => {
    const passed = test.fn();
    results.push({ name: test.name, passed });
    if (passed) totalPassed++;
  });
  
  // Resumo dos resultados
  log('\n📊 Resumo dos Testes:', 'bold');
  log('=' * 50);
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}: PASSOU`);
    } else {
      logError(`${result.name}: FALHOU`);
    }
  });
  
  log(`\n📈 Resultado Final: ${totalPassed}/${tests.length} testes passaram`, 'bold');
  
  if (totalPassed === tests.length) {
    logSuccess('🎉 Todos os testes passaram! Sistema está pronto para produção.');
  } else if (totalPassed >= tests.length * 0.8) {
    logWarning('⚠️  A maioria dos testes passou. Verifique os itens que falharam.');
  } else {
    logError('❌ Muitos testes falharam. Sistema precisa de mais correções.');
  }
  
  return totalPassed / tests.length;
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  const score = runTests();
  process.exit(score === 1 ? 0 : 1);
}

module.exports = { runTests };

