import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { verifyJwtToken } from "@/lib/auth/jwt"; // JWT verification

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY (se necessário para frontend)
function formatDateToDDMMYYYY(dateString: string | null): string | undefined {
    if (!dateString) return undefined;
    try {
        const date = new Date(dateString);
        // Ajuste para UTC para evitar problemas de fuso horário ao formatar
        if (isNaN(date.getTime())) return undefined; // Invalid date
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
    } catch (e) {
        return undefined;
    }
}

// Função auxiliar para formatar o documento no formato esperado pelo frontend
function formatarDocumentoMySQL(item: any): any { // Ajustar 'any' para um tipo Documento mais preciso
  return {
    id: item.id,
    nome: item.nome,
    tipo: item.tipo,
    urlDocumento: item.url_documento,
    arquivoPath: item.arquivo_path,
    formato: item.formato,
    tamanho: item.tamanho,
    status: item.status,
    criadoPor: item.criado_por, // User ID
    criadoPorNome: item.criado_por_nome, // User Name from join
    dataCriacao: item.data_criacao,
    dataAtualizacao: item.data_atualizacao,
    licitacaoId: item.licitacao_id,
    licitacaoTitulo: item.licitacao_titulo,
    descricao: item.descricao,
    numeroDocumento: item.numero_documento,
    dataValidade: formatDateToDDMMYYYY(item.data_validade),
    categoriaLegado: item.categoria, // Changed from item.categoria_legado to item.categoria
    tags: item.tags_concatenadas ? item.tags_concatenadas.split(', ') : [],
  };
}


// GET - Obter todos os documentos ou filtrar por parâmetros
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/documentos/doc - Iniciando consulta com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for GET /api/documentos/doc");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();

    let sql = `
      SELECT
          d.id, d.nome, d.tipo, d.url_documento, d.arquivo_path, d.formato,
          d.tamanho, d.status, d.criado_por, u_creator.name as criado_por_nome,
          d.data_criacao, d.data_atualizacao,
          d.licitacao_id, l.titulo as licitacao_titulo,
          d.descricao, d.numero_documento, d.data_validade, d.categoria, -- Changed from d.categoria AS categoria_legado
          (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ')
           FROM tags t JOIN documentos_tags dt ON t.id = dt.tag_id
           WHERE dt.documento_id = d.id) as tags_concatenadas
      FROM documentos d
      LEFT JOIN licitacoes l ON d.licitacao_id = l.id
      LEFT JOIN users u_creator ON d.criado_por = u_creator.id
    `;
    const conditions: string[] = [];
    const paramsSql: any[] = [];

    const licitacaoId = searchParams.get('licitacaoId');
    if (licitacaoId) { conditions.push('d.licitacao_id = ?'); paramsSql.push(licitacaoId); }

    const tipo = searchParams.get('tipo');
    if (tipo) { conditions.push('d.tipo = ?'); paramsSql.push(tipo); }

    const statusParam = searchParams.get('status');
    if (statusParam) { conditions.push('d.status = ?'); paramsSql.push(statusParam); }

    const tagNome = searchParams.get('tagNome');
    if (tagNome) {
      conditions.push('EXISTS (SELECT 1 FROM documentos_tags dt_filter JOIN tags t_filter ON dt_filter.tag_id = t_filter.id WHERE dt_filter.documento_id = d.id AND t_filter.nome = ?)');
      paramsSql.push(tagNome);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY d.id ORDER BY d.data_criacao DESC';

    console.log("Executando SQL GET Documentos:", sql, paramsSql);
    const [rows] = await connection.execute(sql, paramsSql);

    const documentos = (rows as any[]).map(formatarDocumentoMySQL);
    return NextResponse.json({ success: true, documentos: documentos || [] });

  } catch (error: any) {
    console.error('Erro ao processar requisição de documentos (MySQL):', error);
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

// POST - Criar um novo documento (metadados apenas)
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/documentos/doc - Iniciando criação com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for POST /api/documentos/doc");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }
    const userIdFromToken = decodedToken.userId;

    const body = await request.json();
    console.log("Dados recebidos para POST Documento:", body);
    
    if (!body.nome || !body.tipo ) { // licitacaoId pode ser opcional para documentos gerais
      return NextResponse.json({ error: 'Nome e tipo são campos obrigatórios' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const newDocumentId = uuidv4();
    // url_documento and arquivo_path are null for metadata-only entries
    // The actual file upload is handled by the /api/documentos/doc/upload route

    const documentoDb = {
      id: newDocumentId,
      nome: body.nome,
      tipo: body.tipo,
      licitacao_id: body.licitacaoId || null,
      criado_por: userIdFromToken,
      url_documento: null, // Metadata-only, no direct file URL
      arquivo_path: null, // Metadata-only, no file path
      formato: body.formato || null,
      tamanho: body.tamanho || 0, // Should be 0 or null if no file
      status: body.status || 'ativo',
      descricao: body.descricao || null,
      numero_documento: body.numeroDocumento || null,
      data_validade: body.dataValidade ? new Date(body.dataValidade).toISOString().split('T')[0] : null,
      categoria: body.categoriaLegado || null, // Manter o campo legado
    };

    const fields = Object.keys(documentoDb);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(documentoDb);

    const sqlInsert = `INSERT INTO documentos (${fields.join(', ')}, data_criacao, data_atualizacao) VALUES (${placeholders}, NOW(), NOW())`;
    await connection.execute(sqlInsert, values);
    console.log("Documento (metadados) inserido com ID:", newDocumentId);

    // Tags handling remains the same
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
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
        await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocumentId, tagId]);
      }
    }

    await connection.commit();

    // Fetch e formatar para resposta
    const [createdDocRows]: any = await connection.execute(
      `SELECT d.*, l.titulo as licitacao_titulo, u.name as criado_por_nome,
              (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ') FROM tags t JOIN documentos_tags dt ON t.id = dt.tag_id WHERE dt.documento_id = d.id) as tags_concatenadas
       FROM documentos d
       LEFT JOIN licitacoes l ON d.licitacao_id = l.id
       LEFT JOIN users u ON d.criado_por = u.id
       WHERE d.id = ? GROUP BY d.id`, [newDocumentId]
    );

    return NextResponse.json({
      success: true,
      message: 'Metadados do documento criados com sucesso.', // Adjusted message
      documento: formatarDocumentoMySQL(createdDocRows[0])
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao processar criação de documento (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
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

// PATCH - Atualizar um documento existente
export async function PATCH(request: NextRequest) {
  let connection;
  console.log("PATCH /api/documentos/doc - Iniciando atualização com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for PATCH /api/documentos/doc");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token); // Valida e decodifica
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }
    // const userIdFromToken = decodedToken.userId; // Para verificação de permissão, se necessário

    const body = await request.json();
    console.log("Dados recebidos para PATCH Documento:", body);
    
    if (!body.id) {
      return NextResponse.json({ error: 'ID do documento é obrigatório para atualização' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();
    
    const updateData: any = {};
    const allowedFields = ['nome', 'tipo', 'descricao', 'numeroDocumento', 'dataValidade', 'status', 'categoriaLegado', 'licitacaoId'];
    // urlDocumento e arquivoPath não são atualizáveis diretamente aqui (ligado ao upload)
    
    for (const key of allowedFields) {
        if (body[key] !== undefined) {
            let dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`); // camelToSnake
            if (key === 'categoriaLegado') dbKey = 'categoria';
            if (key === 'numeroDocumento') dbKey = 'numero_documento';
            if (key === 'dataValidade') dbKey = 'data_validade';
            if (key === 'licitacaoId') dbKey = 'licitacao_id';

            updateData[dbKey] = (key === 'dataValidade' && body[key]) ? new Date(body[key]).toISOString().split('T')[0] : body[key];
        }
    }

    if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date(); // Manual update for timestamp
        const fieldPlaceholders = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updateData), body.id];
        const sqlUpdate = `UPDATE documentos SET ${fieldPlaceholders} WHERE id = ?`;
        const [result]:any = await connection.execute(sqlUpdate, values);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: 'Documento não encontrado para atualização' }, { status: 404 });
        }
    }

    if (body.hasOwnProperty('tags') && Array.isArray(body.tags)) {
      await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [body.id]);
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
          await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [body.id, tagId]);
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
       WHERE d.id = ? GROUP BY d.id`, [body.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Documento atualizado com sucesso',
      documento: formatarDocumentoMySQL(updatedDocRows[0])
    });
  } catch (error: any) {
    console.error('Erro ao processar atualização de documento (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
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

// DELETE - Excluir ou marcar um documento como excluído
export async function DELETE(request: NextRequest) {
  let connection;
  console.log("DELETE /api/documentos/doc - Iniciando exclusão com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for DELETE /api/documentos/doc");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }
    // const userIdFromToken = decodedToken.userId; // Para verificação de permissão, se necessário

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // ID do documento
    
    console.log('DELETE /api/documentos/doc - ID recebido:', id);
    console.log('DELETE /api/documentos/doc - URL completa:', request.url);
    
    if (!id) {
      console.log('DELETE /api/documentos/doc - ID não fornecido');
      return NextResponse.json({ error: 'ID do documento é obrigatório para exclusão' }, { status: 400 });
    }

    const excluirFisicamente = searchParams.get('fisicamente') === 'true';
    connection = await getDbConnection();
    
    if (excluirFisicamente) {
      console.warn(`AVISO: Exclusão física do arquivo de storage para documento ${id} NÃO está implementada.`);
      // ON DELETE CASCADE na FK de documentos_tags para documento_id cuidará da limpeza em documentos_tags.
      const [result]: any = await connection.execute('DELETE FROM documentos WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Documento não encontrado para exclusão física' }, { status: 404 });
      }
    } else {
      // Soft delete
      console.log('DELETE /api/documentos/doc - Executando soft delete para ID:', id);
      const [result]: any = await connection.execute(
        "UPDATE documentos SET status = 'excluido', data_atualizacao = NOW() WHERE id = ?",
        [id]
      );
      console.log('DELETE /api/documentos/doc - Resultado da query:', result.affectedRows, 'linhas afetadas');
      if (result.affectedRows === 0) {
        console.log('DELETE /api/documentos/doc - Nenhuma linha foi afetada, documento não encontrado');
        return NextResponse.json({ error: 'Documento não encontrado para marcar como excluído' }, { status: 404 });
      }
    }

    console.log('DELETE /api/documentos/doc - Exclusão realizada com sucesso para ID:', id);
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
