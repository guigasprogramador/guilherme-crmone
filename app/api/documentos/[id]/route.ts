import { NextRequest, NextResponse } from 'next/server';
// import { Documento } from '@/types/licitacoes'; // Type might need adjustment
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { verifyJwtToken } from "@/lib/auth/jwt";

interface PathParams {
  params: {
    id: string; // This is the documentoId
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

async function fetchFullDocumentDetails(connection: any, documentoId: string) {
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
      WHERE d.id = ?
      GROUP BY d.id;
    `;
    const [rows]: any = await connection.execute(sql, [documentoId]);
    if (rows.length === 0) return null;
    return formatarDocumentoMySQL(rows[0]);
}


// GET - Obter um documento específico
export async function GET(
  request: NextRequest,
  { params }: PathParams
) {
  let connection;
  const documentoId = (await params).id; // Here, params.id is the documentoId
  console.log(`GET /api/documentos/${documentoId} - Iniciando consulta com MySQL`);

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    if (!documentoId) {
      return NextResponse.json({ error: 'ID do Documento é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();
    const documentoFormatado = await fetchFullDocumentDetails(connection, documentoId);
    
    if (!documentoFormatado) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }
    
    console.warn("A `urlDocumento` retornada é um placeholder e não aponta para um arquivo real.");
    return NextResponse.json(documentoFormatado);

  } catch (error: any) {
    console.error('Erro ao buscar documento (MySQL GET by ID):', error);
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao buscar documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar um documento (substituição completa)
export async function PUT(
  request: NextRequest,
  { params }: PathParams
) {
  let connection;
  const documentoId = (await params).id;
  console.log(`PUT /api/documentos/${documentoId} - Iniciando atualização com MySQL`);

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }
    // const userIdFromToken = decodedToken.userId; // Para autorização futura

    if (!documentoId) {
      return NextResponse.json({ error: 'ID do Documento é obrigatório' }, { status: 400 });
    }
    
    const data = await request.json();
    console.log("Dados para atualização (PUT):", data);

    if (!data.nome || !data.tipo) { // Adicionar mais validações se necessário
      return NextResponse.json({ error: 'Nome e tipo do documento são obrigatórios' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const docUpdateData = {
      nome: data.nome,
      tipo: data.tipo,
      descricao: data.descricao || null,
      numero_documento: data.numeroDocumento || null,
      data_validade: data.dataValidade ? new Date(data.dataValidade).toISOString().split('T')[0] : null,
      status: data.status || 'ativo',
      licitacao_id: data.licitacaoId || null, // Permitir alterar a licitação associada
      categoria: data.categoriaLegado || null,
      // url_documento e arquivo_path não são atualizados aqui.
      // criado_por não deve ser alterado em um PUT.
    };

    const fieldsToUpdate = Object.keys(docUpdateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(docUpdateData), documentoId];

    const sqlUpdateDoc = `UPDATE documentos SET ${fieldsToUpdate}, updated_at = NOW() WHERE id = ?`;
    const [resultUpdate]: any = await connection.execute(sqlUpdateDoc, values);

    if (resultUpdate.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Documento não encontrado para atualização' }, { status: 404 });
    }

    // Atualizar Tags
    await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [documentoId]);
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      for (const tagName of data.tags) {
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
    
    await connection.commit();
    const updatedDocument = await fetchFullDocumentDetails(connection, documentoId);
    return NextResponse.json(updatedDocument);

  } catch (error: any) {
    console.error('Erro ao atualizar documento (MySQL PUT):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno ao atualizar documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Atualizar parcialmente um documento
export async function PATCH(
  request: NextRequest,
  { params }: PathParams
) {
  let connection;
  const documentoId = (await params).id;
  console.log(`PATCH /api/documentos/${documentoId} - Iniciando atualização parcial com MySQL`);

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    if (!documentoId) {
      return NextResponse.json({ error: 'ID do Documento é obrigatório' }, { status: 400 });
    }
    
    const data = await request.json();
    if (Object.keys(data).length === 0 && !data.hasOwnProperty('tags')) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    const allowedFields: Record<string, string> = {
        nome: 'nome', tipo: 'tipo', descricao: 'descricao', numeroDocumento: 'numero_documento',
        dataValidade: 'data_validade', status: 'status', categoriaLegado: 'categoria', licitacaoId: 'licitacao_id'
    };

    for (const key in data) {
        if (allowedFields[key]) {
            let value = data[key];
            const dbKey = allowedFields[key];
            if (key === 'dataValidade') value = value ? new Date(value).toISOString().split('T')[0] : null;

            updateFields.push(`${dbKey} = ?`);
            updateValues.push(value);
        }
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      const sqlUpdateDoc = `UPDATE documentos SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(documentoId);
      const [resultUpdate]: any = await connection.execute(sqlUpdateDoc, updateValues);
      if (resultUpdate.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Documento não encontrado para atualização parcial' }, { status: 404 });
      }
    }

    if (data.hasOwnProperty('tags') && Array.isArray(data.tags)) {
      await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [documentoId]);
      if (data.tags.length > 0) {
        for (const tagName of data.tags) {
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
    const updatedDocument = await fetchFullDocumentDetails(connection, documentoId);
    return NextResponse.json(updatedDocument);

  } catch (error: any) {
    console.error('Erro ao atualizar parcialmente documento (MySQL PATCH):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback PATCH:", rbError));
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno ao atualizar parcialmente o documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir um documento
export async function DELETE(
  request: NextRequest,
  { params }: PathParams
) {
  let connection;
  const documentoId = (await params).id; // Here, params.id is the documentoId
  console.log(`DELETE /api/documentos/${documentoId} - Iniciando exclusão com MySQL`);
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    if (!documentoId) {
      return NextResponse.json({ error: 'ID do Documento é obrigatório' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const excluirFisicamente = searchParams.get('fisicamente') === 'true';
    connection = await getDbConnection();
    
    let affectedRows = 0;
    if (excluirFisicamente) {
      console.warn(`AVISO: Exclusão física do arquivo de storage para documento ${documentoId} NÃO está implementada.`);
      // ON DELETE CASCADE na FK de documentos_tags para documento_id cuidará da limpeza em documentos_tags.
      const [result]: any = await connection.execute('DELETE FROM documentos WHERE id = ?', [documentoId]);
      affectedRows = result.affectedRows;
    } else {
      // Soft delete
      const [result]: any = await connection.execute(
        "UPDATE documentos SET status = 'excluido', updated_at = NOW() WHERE id = ?",
        [documentoId]
      );
      affectedRows = result.affectedRows;
    }

    if (affectedRows === 0) {
      return NextResponse.json({ error: 'Documento não encontrado para exclusão/atualização de status' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: excluirFisicamente
        ? 'Documento excluído permanentemente com sucesso (registro no DB).'
        : 'Documento marcado como excluído com sucesso.'
    });
  } catch (error: any) {
    console.error('Erro ao excluir documento (MySQL):', error);
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao excluir documento' },
      { status: 500 }
    );
  }
}
