import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { verifyJwtToken } from "@/lib/auth/jwt";

interface PathParams {
  params: {
    id: string; // This is licitacaoId from the path
    documentoId: string;
  };
}

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY (se necessário para frontend)
function formatDateToDDMMYYYY(dateString: string | null): string | undefined {
    if (!dateString) return undefined;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return undefined; // Invalid date
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
    } catch(e) {
        return undefined;
    }
}

// Função auxiliar para formatar o documento no formato esperado pelo frontend
// Similar to the one in `../doc/route.ts`
function formatarDocumentoMySQL(item: any): any {
  if (!item) return null;
  return {
    id: item.id,
    nome: item.nome,
    tipo: item.tipo,
    urlDocumento: item.url_documento, // Placeholder
    arquivoPath: item.arquivo_path,   // Placeholder
    formato: item.formato,
    tamanho: item.tamanho,
    status: item.status,
    criadoPor: item.criado_por,
    criadoPorNome: item.criado_por_nome,
    dataCriacao: item.data_criacao,
    dataAtualizacao: item.data_atualizacao,
    licitacaoId: item.licitacao_id,
    licitacaoTitulo: item.licitacao_titulo,
    descricao: item.descricao,
    numeroDocumento: item.numero_documento,
    dataValidade: formatDateToDDMMYYYY(item.data_validade),
    categoriaLegado: item.categoria,
    tags: item.tags_concatenadas ? item.tags_concatenadas.split(', ') : [],
  };
}


// GET - Obter um documento específico pelo ID
export async function GET(request: NextRequest, { params }: PathParams) {
  let connection;
  const { id: licitacaoId, documentoId } = await params; // Correctly name params
  console.log(`GET /api/documentos/doc/${documentoId} for licitacao ${licitacaoId} - MySQL`);

  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for GET /api/documentos/doc/[id]");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    if (!documentoId || !licitacaoId) {
      return NextResponse.json({ error: 'ID do Documento e ID da Licitação são obrigatórios' }, { status: 400 });
    }

    connection = await getDbConnection();
    const sql = `
      SELECT
          d.*,
          l.titulo as licitacao_titulo,
          u.name as criado_por_nome,
          (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ')
           FROM tags t JOIN documentos_tags dt ON t.id = dt.tag_id
           WHERE dt.documento_id = d.id) as tags_concatenadas
      FROM documentos d
      LEFT JOIN licitacoes l ON d.licitacao_id = l.id
      LEFT JOIN users u ON d.criado_por = u.id
      WHERE d.id = ? AND d.licitacao_id = ?
      GROUP BY d.id;
    `;
    const [rows]: any = await connection.execute(sql, [documentoId, licitacaoId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação especificada' }, { status: 404 });
    }

    console.warn("A `publicUrl` retornada para o documento é um placeholder e não aponta para um arquivo real.");
    const documentoFormatado = formatarDocumentoMySQL(rows[0]);

    return NextResponse.json({ success: true, documento: documentoFormatado });

  } catch (error: any) {
    console.error('Erro ao processar requisição de documento (MySQL GET):', error);
     if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message, details: error.code },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Atualizar um documento específico pelo ID
export async function PATCH(request: NextRequest, { params }: PathParams) {
  let connection;
  const { id: licitacaoId, documentoId } = params; // Correctly name params
  console.log(`PATCH /api/documentos/doc/${documentoId} for licitacao ${licitacaoId} - MySQL`);

  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for PATCH /api/documentos/doc/[id]");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }
    // const userIdFromToken = decodedToken.userId; // Para autorização futura

    if (!documentoId || !licitacaoId) {
      return NextResponse.json({ error: 'ID do Documento e ID da Licitação são obrigatórios' }, { status: 400 });
    }

    const body = await request.json();
    if (Object.keys(body).length === 0 && !body.hasOwnProperty('tags')) { // Permitir atualização apenas de tags
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();
    
    const updateData: any = {};
    const allowedFields = ['nome', 'tipo', 'descricao', 'numeroDocumento', 'dataValidade', 'status', 'categoriaLegado'];
    
    for (const key of allowedFields) {
        if (body[key] !== undefined) {
            let dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (key === 'categoriaLegado') dbKey = 'categoria';
            if (key === 'numeroDocumento') dbKey = 'numero_documento';
            if (key === 'dataValidade') dbKey = 'data_validade';

            updateData[dbKey] = (key === 'dataValidade' && body[key])
                ? (body[key] ? new Date(body[key]).toISOString().split('T')[0] : null)
                : body[key];
        }
    }
    // url_documento e arquivo_path não são atualizáveis via este PATCH, pois estão ligados ao upload.
    
    if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date(); // Manual update for timestamp
        const fieldPlaceholders = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updateData), documentoId, licitacaoId];
        const sqlUpdate = `UPDATE documentos SET ${fieldPlaceholders} WHERE id = ? AND licitacao_id = ?`;
        const [result]:any = await connection.execute(sqlUpdate, values);
        if (result.affectedRows === 0 && Object.keys(updateData).length > 1) { // length > 1 because updated_at is always there
            await connection.rollback();
            return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação' }, { status: 404 });
        }
    }

    if (body.hasOwnProperty('tags') && Array.isArray(body.tags)) {
      console.log("Atualizando tags para o documento:", documentoId);
      await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [documentoId]);
      if (body.tags.length > 0) {
        for (const tagName of body.tags) {
          if (typeof tagName !== 'string' || tagName.trim() === '') continue;
          let [tagRows]: any = await connection.execute('SELECT id FROM tags WHERE nome = ?', [tagName.trim()]);
          let tagId;
          if (tagRows.length > 0) {
            tagId = tagRows[0].id;
          } else {
            tagId = uuidv4();
            await connection.execute('INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [tagId, tagName.trim()]);
          }
          await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [documentoId, tagId]);
        }
      }
    }

    await connection.commit();

    const [updatedDocRows]: any = await connection.execute(
         `SELECT d.*, l.titulo as licitacao_titulo, u.name as criado_por_nome,
              (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ') FROM tags t JOIN documentos_tags dt ON t.id = dt.tag_id WHERE dt.documento_id = d.id) as tags_concatenadas
          FROM documentos d
          LEFT JOIN licitacoes l ON d.licitacao_id = l.id
          LEFT JOIN users u ON d.criado_por = u.id
          WHERE d.id = ? AND d.licitacao_id = ? GROUP BY d.id`, [documentoId, licitacaoId]
    );

    if (updatedDocRows.length === 0) {
        // Should not happen if update was successful and ID is correct
        return NextResponse.json({ error: 'Documento não encontrado após atualização' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Documento atualizado com sucesso',
      documento: formatarDocumentoMySQL(updatedDocRows[0])
    });
  } catch (error: any) {
    console.error('Erro ao processar atualização de documento (MySQL PATCH):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback PATCH:", rbError));
     if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message, details: error.code },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir um documento específico pelo ID
export async function DELETE(request: NextRequest, { params }: PathParams) {
  let connection;
  const { id: licitacaoId, documentoId } = await params; // Correctly name params
  console.log(`DELETE /api/documentos/doc/${documentoId} for licitacao ${licitacaoId} - MySQL`);
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for DELETE /api/documentos/doc/[id]");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    if (!documentoId || !licitacaoId) {
      return NextResponse.json({ error: 'ID do Documento e ID da Licitação são obrigatórios' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const excluirFisicamente = searchParams.get('fisicamente') === 'true';
    connection = await getDbConnection();
    
    let affectedRows = 0;
    if (excluirFisicamente) {
      console.warn(`AVISO: Exclusão física do arquivo de storage para documento ${documentoId} NÃO está implementada.`);
      // ON DELETE CASCADE na FK de documentos_tags para documento_id cuidará da limpeza em documentos_tags.
      const [result]: any = await connection.execute(
        'DELETE FROM documentos WHERE id = ? AND licitacao_id = ?',
        [documentoId, licitacaoId]
      );
      affectedRows = result.affectedRows;
    } else {
      // Soft delete
      const [result]: any = await connection.execute(
        "UPDATE documentos SET status = 'excluido', updated_at = NOW() WHERE id = ? AND licitacao_id = ?",
        [documentoId, licitacaoId]
      );
      affectedRows = result.affectedRows;
    }

    if (affectedRows === 0) {
        return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação para exclusão/atualização de status' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: excluirFisicamente 
        ? 'Documento excluído permanentemente com sucesso (registro no DB).'
        : 'Documento marcado como excluído com sucesso.'
    });
  } catch (error: any) {
    console.error('Erro ao processar exclusão de documento (MySQL):', error);
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message },
      { status: 500 }
    );
  }
}
