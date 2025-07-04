import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from "@/lib/auth/jwt";

// GET - Listar documentos de uma oportunidade específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }

    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    const oportunidadeId = params.id;
    connection = await getDbConnection();

    const query = `
      SELECT
        d.id,
        d.nome,
        d.tipo,
        d.categoria,
        d.descricao,
        d.numero_documento,
        d.data_validade,
        d.url_documento,
        d.arquivo_path,
        d.formato,
        d.tamanho,
        d.status,
        d.data_criacao,
        d.data_atualizacao,
        u.name as criado_por_nome,
        GROUP_CONCAT(t.nome SEPARATOR ', ') as tags
      FROM documentos d
      LEFT JOIN users u ON d.criado_por = u.id
      LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.oportunidade_id = ?
      GROUP BY d.id
      ORDER BY d.data_criacao DESC
    `;

    const [rows] = await connection.execute(query, [oportunidadeId]);
    const documentos = rows as any[];

    const documentosFormatados = documentos.map((doc: any) => ({
      id: doc.id,
      nome: doc.nome,
      tipo: doc.tipo,
      categoria: doc.categoria,
      descricao: doc.descricao,
      numeroDocumento: doc.numero_documento,
      dataValidade: doc.data_validade ? new Date(doc.data_validade).toLocaleDateString('pt-BR') : null,
      urlDocumento: doc.url_documento,
      arquivoPath: doc.arquivo_path,
      formato: doc.formato,
      tamanho: doc.tamanho,
      status: doc.status,
      dataCriacao: new Date(doc.data_criacao).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      dataAtualizacao: new Date(doc.data_atualizacao).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      criadoPorNome: doc.criado_por_nome,
      tags: doc.tags ? doc.tags.split(', ') : []
    }));

    return NextResponse.json(documentosFormatados);

  } catch (error: any) {
    console.error('Erro ao buscar documentos da oportunidade:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos da oportunidade', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

// POST - Vincular documentos existentes à oportunidade
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }

    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    const oportunidadeId = params.id;
    const { documentos_ids } = await request.json();

    if (!documentos_ids || !Array.isArray(documentos_ids) || documentos_ids.length === 0) {
      return NextResponse.json({ error: 'Lista de IDs de documentos é obrigatória' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    let vinculados = 0;
    let erros = 0;

    for (const documentoId of documentos_ids) {
      try {
        // Verificar se o documento existe
        const [docExists]: any = await connection.execute(
          'SELECT id FROM documentos WHERE id = ?',
          [documentoId]
        );

        if (docExists.length === 0) {
          console.warn(`Documento ${documentoId} não encontrado`);
          erros++;
          continue;
        }

        // Vincular documento à oportunidade
        const [updateResult]: any = await connection.execute(
          'UPDATE documentos SET oportunidade_id = ?, data_atualizacao = NOW() WHERE id = ?',
          [oportunidadeId, documentoId]
        );

        if (updateResult.affectedRows > 0) {
          vinculados++;
          console.log(`Documento ${documentoId} vinculado à oportunidade ${oportunidadeId}`);
        } else {
          erros++;
          console.warn(`Falha ao vincular documento ${documentoId}`);
        }
      } catch (docError: any) {
        console.error(`Erro ao vincular documento ${documentoId}:`, docError.message);
        erros++;
      }
    }

    await connection.commit();

    return NextResponse.json({
      message: `Processo concluído: ${vinculados} documentos vinculados, ${erros} erros`,
      vinculados,
      erros
    });

  } catch (error: any) {
    console.error('Erro ao vincular documentos à oportunidade:', error);
    if (connection) {
      await connection.rollback().catch(rbError => 
        console.error("Erro no rollback:", rbError)
      );
    }
    return NextResponse.json(
      { error: 'Erro ao vincular documentos à oportunidade', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

// DELETE - Desvincular documento da oportunidade
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }

    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    const oportunidadeId = params.id;
    const { searchParams } = new URL(request.url);
    const documentoId = searchParams.get('documento_id');

    if (!documentoId) {
      return NextResponse.json({ error: 'ID do documento é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();

    // Desvincular documento da oportunidade (não deletar o documento)
    const [updateResult]: any = await connection.execute(
      'UPDATE documentos SET oportunidade_id = NULL, data_atualizacao = NOW() WHERE id = ? AND oportunidade_id = ?',
      [documentoId, oportunidadeId]
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Documento não encontrado ou não vinculado a esta oportunidade' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Documento desvinculado da oportunidade com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao desvincular documento da oportunidade:', error);
    return NextResponse.json(
      { error: 'Erro ao desvincular documento da oportunidade', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

