import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Função para formatar o tamanho do arquivo de bytes para KB, MB, etc. (mantida do original)
function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Certificar que bytes não é negativo ou NaN, o que causaria erro no Math.log
  if (isNaN(i) || !isFinite(i)) {
    return '0 Bytes';
  }

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET - Buscar documentos por ID da licitação
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const licitacaoId = searchParams.get('licitacaoId');
    
    console.log(`[DEBUG] Buscando documentos para licitação: ${licitacaoId}`);
    
    if (!licitacaoId) {
      console.log('[DEBUG] ID da licitação não fornecido');
      return NextResponse.json(
        { error: 'ID da licitação é obrigatório' },
        { status: 400 }
      );
    }
    
    connection = await getDbConnection();
    console.log('[DEBUG] Executando consulta no MySQL');
    
    const query = 'SELECT * FROM documentos WHERE licitacao_id = ?';
    const [rows] = await connection.execute(query, [licitacaoId]);

    const documentos = rows as any[]; // Tipar como any[] por enquanto
    
    console.log(`[DEBUG] Documentos encontrados: ${documentos?.length || 0}`);
    console.log('[DEBUG] Dados brutos do MySQL:', JSON.stringify(documentos || []));
    
    // Formatar os dados para o formato esperado pelo front-end
    const documentosFormatados = documentos.map((doc: any) => ({
      id: doc.id,
      nome: doc.nome,
      tipo: doc.categoria || doc.tipo || 'Documento', // Usar categoria ou tipo, com fallback
      url: doc.url_documento, // Campo da tabela MySQL
      data: doc.data_criacao ? new Date(doc.data_criacao).toLocaleDateString('pt-BR') : 'N/A', // Campo da tabela MySQL
      tamanho: formatarTamanho(doc.tamanho || 0), // Campo da tabela MySQL
      licitacaoId: doc.licitacao_id, // Campo da tabela MySQL
      formato: doc.formato, // Campo da tabela MySQL
      arquivo: doc.arquivo_path // Campo da tabela MySQL (public_id do Cloudinary)
    }));
    
    console.log('[DEBUG] Documentos formatados:', JSON.stringify(documentosFormatados));
    
    return NextResponse.json(documentosFormatados);
  } catch (error: any) {
    console.error('[DEBUG] Erro ao listar documentos:', error);
    return NextResponse.json(
      { error: 'Erro ao listar documentos: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.release();
      console.log('[DEBUG] Conexão com MySQL fechada.');
    }
  }
}
