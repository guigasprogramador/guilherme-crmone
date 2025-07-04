import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Função para formatar o tamanho do arquivo de bytes para KB, MB, etc.
function formatarTamanho(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  // Certificar que bytes não é negativo ou NaN, o que causaria erro no Math.log
  if (bytes < 0 || isNaN(bytes) || !isFinite(bytes)) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (isNaN(i) || !isFinite(i)) {
    return '0 Bytes'; // Fallback adicional
  }

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadeId = searchParams.get('oportunidadeId');

    console.log('🔍 API Documentos - Recebida requisição para oportunidade:', oportunidadeId);

    if (!oportunidadeId) {
      console.log('❌ API Documentos - ID da oportunidade não fornecido');
      return NextResponse.json(
        { error: 'ID da oportunidade é obrigatório' },
        { status: 400 }
      );
    }

    connection = await getDbConnection();
    console.log('✅ API Documentos - Conexão com banco estabelecida');

    const query = `
      SELECT
        id,
        nome,
        url_documento,
        formato,
        data_criacao,
        tamanho,
        tipo,
        categoria
      FROM documentos
      WHERE oportunidade_id = ?
      ORDER BY data_criacao DESC
    `;
    const [rows] = await connection.execute(query, [oportunidadeId]);

    const documentos = rows as any[];
    console.log('📊 API Documentos - Encontrados', documentos.length, 'documentos no banco');

    const documentosFormatados = documentos.map((doc: any) => {
      console.log('📄 Processando documento:', doc.nome, 'URL:', doc.url_documento);
      return {
        id: doc.id,
        nome: doc.nome,
        url_documento: doc.url_documento,
        formato: doc.formato,
        data_criacao: doc.data_criacao ? new Date(doc.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A',
        tamanho: formatarTamanho(doc.tamanho),
        tipo: doc.tipo || doc.categoria || 'Documento',
      };
    });

    console.log('✅ API Documentos - Retornando', documentosFormatados.length, 'documentos formatados');
    return NextResponse.json(documentosFormatados);

  } catch (error: any) {
    console.error('Erro ao buscar documentos por oportunidade:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}
