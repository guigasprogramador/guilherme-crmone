import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// GET /api/documentos/por-tag?tag=licitacao
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag é obrigatória' },
        { status: 400 }
      );
    }

    connection = await getDbConnection();

    const sql = `
      SELECT d.* FROM documentos d
      JOIN documentos_tags dt ON dt.documento_id = d.id
      JOIN tags t ON t.id = dt.tag_id
      WHERE t.nome = ?
      ORDER BY d.data_criacao DESC
    `;
    const [rows]: any = await connection.execute(sql, [tag]);

    // Opcional: formatar documentos conforme esperado no frontend
    const documentos = rows.map((item: any) => ({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo,
      urlDocumento: item.url_documento,
      arquivoPath: item.arquivo_path,
      formato: item.formato,
      tamanho: item.tamanho,
      status: item.status,
      criadoPor: item.criado_por,
      dataCriacao: item.data_criacao,
      licitacaoId: item.licitacao_id,
      descricao: item.descricao,
      numeroDocumento: item.numero_documento,
      dataValidade: item.data_validade,
      categoria: item.categoria,
    }));

    return NextResponse.json(documentos);
  } catch (error: any) {
    console.error('Erro ao buscar documentos por tag:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos por tag', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
