const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_licitacoes',
  port: process.env.DB_PORT || 3306
};

async function fixDocumentUrls() {
  let connection;
  
  try {
    console.log('Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // Buscar documentos PDF com URLs que contêm /image/upload/ (salvos incorretamente como image)
    console.log('Buscando documentos PDF com URLs incorretas...');
    const [documents] = await connection.execute(
      'SELECT id, nome, url_documento, formato FROM documentos WHERE url_documento LIKE "%/image/upload/%" AND (formato = "pdf" OR nome LIKE "%.pdf")'
    );
    
    console.log(`Encontrados ${documents.length} documentos PDF com URLs incorretas.`);
    
    if (documents.length === 0) {
      console.log('Nenhum documento PDF precisa ser corrigido.');
      return;
    }
    
    // Corrigir cada documento PDF
    let corrected = 0;
    for (const doc of documents) {
      const oldUrl = doc.url_documento;
      const newUrl = oldUrl.replace('/image/upload/', '/raw/upload/');
      
      console.log(`Corrigindo documento PDF: ${doc.nome}`);
      console.log(`  De: ${oldUrl}`);
      console.log(`  Para: ${newUrl}`);
      
      await connection.execute(
        'UPDATE documentos SET url_documento = ? WHERE id = ?',
        [newUrl, doc.id]
      );
      
      corrected++;
    }
    
    console.log(`\n✅ ${corrected} documentos corrigidos com sucesso!`);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir URLs dos documentos:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o script
fixDocumentUrls();