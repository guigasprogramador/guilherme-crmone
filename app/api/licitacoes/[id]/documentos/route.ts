import { NextRequest, NextResponse } from 'next/server';
// import { Licitacao, Documento } from '@/types/licitacoes'; // Types might need adjustment
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Listar todos os documentos de uma licitação
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id aqui é licitacaoId
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`GET /api/licitacoes/${licitacaoId}/documentos - Iniciando consulta com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    const sql = `
      SELECT
          d.id, d.nome, d.tipo, d.url_documento, d.arquivo_path, d.formato,
          d.tamanho, d.status, d.criado_por, d.data_criacao, d.data_atualizacao,
          d.descricao, d.numero_documento, d.data_validade, d.categoria AS categoria_legado,
          GROUP_CONCAT(t.nome SEPARATOR ', ') as tags
      FROM documentos d
      LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.licitacao_id = ?
      GROUP BY d.id
      ORDER BY d.data_criacao DESC;
    `;
    console.log("Executando SQL:", sql, [licitacaoId]);
    const [rows] = await connection.execute(sql, [licitacaoId]);

    const documentos = (rows as any[]).map(doc => ({
      ...doc,
      tags: doc.tags_concatenadas ? doc.tags_concatenadas.split(', ') : [],
      // Mapear snake_case para camelCase se necessário para o frontend
      urlDocumento: doc.url_documento,
      arquivoPath: doc.arquivo_path,
      criadoPor: doc.criado_por,
      data_criacao: doc.data_criacao,
      data_atualizacao: doc.data_atualizacao,
      numeroDocumento: doc.numero_documento,
      dataValidade: doc.data_validade,
      categoriaLegado: doc.categoria_legado,
    }));

    return NextResponse.json(documentos || []);
  } catch (error: any) {
    console.error('Erro ao buscar documentos da licitação (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos da licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar novo documento a uma licitação
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id aqui é licitacaoId
) {
  let connection;
  const { id } = await params;
  const licitacaoId = id;
  console.log(`POST /api/licitacoes/${licitacaoId}/documentos - Iniciando criação com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório para adicionar documento' }, { status: 400 });
  }

  try {
    const data = await request.json();
    console.log("Dados recebidos para novo documento:", data);
    
    if (!data.nome || !data.tipo) { // Adicionar mais validações conforme necessário
      return NextResponse.json({ error: 'Nome e tipo do documento são obrigatórios' }, { status: 400 });
    }
     if (!data.criadoPor) { // Assumindo que o ID do usuário criador é enviado
      return NextResponse.json({ error: 'ID do usuário criador (criadoPor) é obrigatório' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const newDocumentId = uuidv4();
    const placeholderFileUrl = `pending_storage_solution/uploads/licitacao/${licitacaoId}/${newDocumentId}/${data.nome}`;
    const placeholderFilePath = `licitacao/${licitacaoId}/${newDocumentId}/${data.nome}`;
    console.warn("AVISO: Upload de arquivo para armazenamento físico NÃO está implementado. Usando placeholders.");


    const documentoDb = {
      id: newDocumentId,
      nome: data.nome,
      licitacao_id: licitacaoId,
      url_documento: placeholderFileUrl,
      arquivo_path: placeholderFilePath,
      tipo: data.tipo,
      tamanho: data.tamanho || 0,
      formato: data.formato || null,
      criado_por: data.criadoPor,
      status: data.status || 'ativo',
      descricao: data.descricao || null,
      numero_documento: data.numeroDocumento || null,
      data_validade: data.dataValidade ? new Date(data.dataValidade).toISOString().split('T')[0] : null,
      categoria: data.categoriaLegado || null, // Campo legado
    };

    const docFields = Object.keys(documentoDb);
    const docPlaceholders = docFields.map(() => '?').join(', ');
    const docValues = Object.values(documentoDb);

    const sqlInsertDoc = `INSERT INTO documentos (${docFields.join(', ')}, data_criacao, data_atualizacao) VALUES (${docPlaceholders}, NOW(), NOW())`;
    await connection.execute(sqlInsertDoc, docValues);
    console.log("Documento inserido no DB com ID:", newDocumentId);

    const createdTagsForDocument: { id: string, nome: string }[] = [];
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      for (const tagName of data.tags) {
        if (typeof tagName !== 'string' || tagName.trim() === '') continue;
        let [tagRows]: any = await connection.execute('SELECT id, nome FROM tags WHERE nome = ?', [tagName.trim()]);
        let tagId;
        let currentTagName = tagName.trim();
        if (tagRows.length > 0) {
          tagId = tagRows[0].id;
          currentTagName = tagRows[0].nome;
        } else {
          tagId = uuidv4();
          await connection.execute('INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [tagId, currentTagName]);
        }
        await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocumentId, tagId]);
        createdTagsForDocument.push({ id: tagId, nome: currentTagName });
      }
    }
    
    await connection.commit();
    console.log("Transação MySQL commitada para novo documento.");

    // Buscar o documento recém-criado para retornar
    const [createdDocRows]: any = await connection.execute(
       `SELECT d.*, GROUP_CONCAT(t.nome SEPARATOR ', ') as tags_concatenadas
        FROM documentos d
        LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
        LEFT JOIN tags t ON dt.tag_id = t.id
        WHERE d.id = ? GROUP BY d.id`, [newDocumentId]);

    if (createdDocRows.length === 0) {
        return NextResponse.json({ error: "Falha ao recuperar documento recém-criado" }, { status: 500 });
    }
    const docCriado = createdDocRows[0];
    const responseDoc = {
        ...docCriado,
        tags: docCriado.tags_concatenadas ? docCriado.tags_concatenadas.split(', ') : [],
         urlDocumento: docCriado.url_documento,
         arquivoPath: docCriado.arquivo_path,
         criadoPor: docCriado.criado_por,
         dataCriacao: docCriado.data_criacao,
         dataAtualizacao: docCriado.data_atualizacao,
         numeroDocumento: docCriado.numero_documento,
         dataValidade: docCriado.data_validade,
         categoriaLegado: docCriado.categoria_legado,
    };
    
    return NextResponse.json(responseDoc, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar documento (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    return NextResponse.json(
      { error: 'Erro ao adicionar documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Remover todos os documentos de uma licitação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id aqui é licitacaoId
) {
  let connection;
  const { id } = await params;
  const licitacaoId = id;
  console.log(`DELETE /api/licitacoes/${licitacaoId}/documentos - Iniciando exclusão com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório para excluir documentos' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Como 'documentos_tags.documento_id' tem ON DELETE CASCADE,
    // ao deletar de 'documentos', as entradas em 'documentos_tags' serão removidas.
    const [result]: any = await connection.execute('DELETE FROM documentos WHERE licitacao_id = ?', [licitacaoId]);
    const documentosRemovidos = result.affectedRows;

    // Atualizar data_atualizacao da licitação principal
    // await connection.execute('UPDATE licitacoes SET updated_at = NOW() WHERE id = ?', [licitacaoId]);
    // Decidido não atualizar a licitação pai aqui, pois é uma operação em sub-recurso.

    await connection.commit();
    console.log(`${documentosRemovidos} documentos da licitação ${licitacaoId} foram excluídos.`);
    
    return NextResponse.json(
      { message: `${documentosRemovidos} documento(s) removido(s) com sucesso da licitação.` },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Erro ao remover documentos da licitação (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    return NextResponse.json(
      { error: 'Erro ao remover documentos' },
      { status: 500 }
    );
  }
}
