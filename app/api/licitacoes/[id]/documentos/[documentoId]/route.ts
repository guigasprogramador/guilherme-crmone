import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { cloudinary } from '@/lib/cloudinary/config'; // Importar cloudinary

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY
function formatDateToDDMMYYYY(dateString: string | null): string | undefined {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    // Ajuste para UTC para evitar problemas de fuso horário ao formatar
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
}

// Helper para formatar um único documento do MySQL
function formatarDocumentoMySQL(doc: any) {
  if (!doc) return null;
  return {
    id: doc.id,
    nome: doc.nome,
    tipo: doc.tipo,
    urlDocumento: doc.url_documento,
    arquivoPath: doc.arquivo_path,
    formato: doc.formato,
    tamanho: doc.tamanho,
    status: doc.status,
    criadoPor: doc.criado_por, // Este seria o ID do usuário
    // uploaderName: doc.uploader_name, // Se fizermos join com users na query GET
    data_criacao: doc.data_criacao,
    data_atualizacao: doc.data_atualizacao,
    descricao: doc.descricao,
    numeroDocumento: doc.numero_documento,
    dataValidade: formatDateToDDMMYYYY(doc.data_validade), // Formatar data
    licitacaoId: doc.licitacao_id,
    categoriaLegado: doc.categoria, // Campo legado
    tags: doc.tags_concatenadas ? doc.tags_concatenadas.split(', ') : [],
  };
}


// GET - Obter um documento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentoId: string } } // id é licitacaoId
) {
  let connection;
  const { id: licitacaoId, documentoId } = params;
  console.log(`GET /api/licitacoes/${licitacaoId}/documentos/${documentoId} - Iniciando consulta com MySQL`);

  if (!licitacaoId || !documentoId) {
    return NextResponse.json({ error: 'ID da Licitação e ID do Documento são obrigatórios' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    const sql = `
      SELECT
          d.*,
          (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ') FROM tags t JOIN documentos_tags dt ON t.id = dt.tag_id WHERE dt.documento_id = d.id) as tags_concatenadas
      FROM documentos d
      WHERE d.id = ? AND d.licitacao_id = ?
      GROUP BY d.id;
    `;
    console.log("Executando SQL:", sql, [documentoId, licitacaoId]);
    const [rows]: any = await connection.execute(sql, [documentoId, licitacaoId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Documento não encontrado nesta licitação' }, { status: 404 });
    }
    
    return NextResponse.json(formatarDocumentoMySQL(rows[0]));
  } catch (error: any) {
    console.error('Erro ao buscar documento (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar um documento específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; documentoId: string } } // id é licitacaoId
) {
  let connection;
  const { id: licitacaoId, documentoId } = params;
  console.log(`PUT /api/licitacoes/${licitacaoId}/documentos/${documentoId} - Iniciando atualização com MySQL`);

  if (!licitacaoId || !documentoId) {
    return NextResponse.json({ error: 'ID da Licitação e ID do Documento são obrigatórios' }, { status: 400 });
  }

  try {
    const data = await request.json();
    console.log("Dados para atualização do documento:", data);

    if (!data.nome || !data.tipo) { // Adicionar mais validações conforme necessário
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
      // url_documento e arquivo_path não são atualizados aqui, pois o upload é um processo separado
      // criado_por e licitacao_id não devem ser alterados em um PUT de documento existente
      categoria: data.categoriaLegado || null, // Campo legado
    };

    const fieldsToUpdate = Object.keys(docUpdateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(docUpdateData), documentoId, licitacaoId];

    const sqlUpdateDoc = `UPDATE documentos SET ${fieldsToUpdate}, updated_at = NOW() WHERE id = ? AND licitacao_id = ?`;
    const [resultUpdate]: any = await connection.execute(sqlUpdateDoc, values);

    if (resultUpdate.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação especificada' }, { status: 404 });
    }

    // Atualizar Tags
    await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [documentoId]);
    const updatedTagsForDocument: { id: string, nome: string }[] = [];
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
        await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [documentoId, tagId]);
        updatedTagsForDocument.push({id: tagId, nome: currentTagName});
      }
    }

    await connection.commit();
    console.log("Transação MySQL commitada para atualização do documento ID:", documentoId);

    // Buscar o documento atualizado para retornar
    const [updatedDocRows]: any = await connection.execute(
         `SELECT d.*, GROUP_CONCAT(t.nome SEPARATOR ', ') as tags_concatenadas
          FROM documentos d
          LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
          LEFT JOIN tags t ON dt.tag_id = t.id
          WHERE d.id = ? GROUP BY d.id`, [documentoId]);

    return NextResponse.json(formatarDocumentoMySQL(updatedDocRows[0]));

  } catch (error: any) {
    console.error('Erro ao atualizar documento (MySQL PUT):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
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
  { params }: { params: { id: string; documentoId: string } } // id é licitacaoId
) {
  let connection;
  const { id: licitacaoId, documentoId } = params;
  console.log(`PATCH /api/licitacoes/${licitacaoId}/documentos/${documentoId} - Iniciando atualização parcial com MySQL`);

  if (!licitacaoId || !documentoId) {
    return NextResponse.json({ error: 'ID da Licitação e ID do Documento são obrigatórios' }, { status: 400 });
  }

  try {
    const data = await request.json();
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Mapear campos permitidos para atualização parcial
    const allowedFields: Record<string, string> = {
        nome: 'nome', tipo: 'tipo', descricao: 'descricao', numeroDocumento: 'numero_documento',
        dataValidade: 'data_validade', status: 'status', categoriaLegado: 'categoria'
        // url_documento e arquivo_path não são atualizados aqui
    };

    for (const key in data) {
        if (allowedFields[key]) {
            let value = data[key];
            if (key === 'dataValidade') value = value ? new Date(value).toISOString().split('T')[0] : null;

            updateFields.push(`${allowedFields[key]} = ?`);
            updateValues.push(value);
        }
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`); // Sempre atualizar o timestamp
      const sqlUpdateDoc = `UPDATE documentos SET ${updateFields.join(', ')} WHERE id = ? AND licitacao_id = ?`;
      updateValues.push(documentoId, licitacaoId);
      const [resultUpdate]: any = await connection.execute(sqlUpdateDoc, updateValues);
      if (resultUpdate.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação' }, { status: 404 });
      }
    }

    // Se 'tags' está presente no payload do PATCH, substituir todas as tags existentes
    if (data.hasOwnProperty('tags')) {
        await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [documentoId]);
        if (Array.isArray(data.tags) && data.tags.length > 0) {
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
    console.log("Transação MySQL commitada para PATCH do documento ID:", documentoId);

    const [updatedDocRows]: any = await connection.execute(
         `SELECT d.*, GROUP_CONCAT(t.nome SEPARATOR ', ') as tags_concatenadas
          FROM documentos d
          LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
          LEFT JOIN tags t ON dt.tag_id = t.id
          WHERE d.id = ? GROUP BY d.id`, [documentoId]);

    return NextResponse.json(formatarDocumentoMySQL(updatedDocRows[0]));

  } catch (error: any) {
    console.error('Erro ao atualizar parcialmente documento (MySQL PATCH):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback PATCH:", rbError));
    return NextResponse.json(
      { error: 'Erro interno ao atualizar parcialmente o documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}


// DELETE - Excluir um documento específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentoId: string } } // id é licitacaoId
) {
  let connection;
  const { id: licitacaoId, documentoId } = params;
  console.log(`DELETE /api/licitacoes/${licitacaoId}/documentos/${documentoId} - Iniciando exclusão`);

  if (!licitacaoId || !documentoId) {
    return NextResponse.json({ error: 'ID da Licitação e ID do Documento são obrigatórios' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Obter o arquivo_path (public_id do Cloudinary) e formato
    const [docRows]: any = await connection.execute(
      'SELECT arquivo_path, formato FROM documentos WHERE id = ? AND licitacao_id = ?',
      [documentoId, licitacaoId]
    );

    if (docRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Documento não encontrado ou não pertence à licitação' }, { status: 404 });
    }
    const arquivoPath = docRows[0].arquivo_path;
    const formato = docRows[0].formato;

    // 2. Excluir do Cloudinary se arquivo_path existir
    if (arquivoPath) {
      try {
        let resourceType = "raw"; // Default para documentos genéricos/PDFs
        const formatoLower = formato?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(formatoLower)) {
          resourceType = "image";
        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(formatoLower)) {
          resourceType = "video";
        }

        console.log(`Tentando excluir do Cloudinary: public_id=${arquivoPath}, resource_type=${resourceType}`);
        const destructionResult = await cloudinary.uploader.destroy(arquivoPath, { resource_type: resourceType });
        console.log(`Arquivo ${arquivoPath} excluído do Cloudinary. Resultado:`, destructionResult);
        // Cloudinary retorna { result: 'ok' } ou { result: 'not found' } etc.
        // Se 'not found', não consideramos um erro fatal para a exclusão do DB.
        if (destructionResult.result !== 'ok' && destructionResult.result !== 'not found') {
            // Logar um aviso, mas não necessariamente bloquear a exclusão do DB se o arquivo já não estava lá
            console.warn(`Aviso ao excluir do Cloudinary: ${destructionResult.result}`);
        }

      } catch (cloudinaryError: any) {
        // Não reverter a transação por falha no Cloudinary, apenas logar.
        // A exclusão do DB é mais crítica. Ou, dependendo da política, pode-se reverter.
        // Por ora, vamos logar e continuar para remover do DB.
        console.error('Erro ao excluir arquivo do Cloudinary (não fatal para DB):', cloudinaryError);
        // Se a política for estrita:
        // await connection.rollback();
        // return NextResponse.json({ error: 'Erro ao excluir arquivo do storage', details: cloudinaryError.message || cloudinaryError }, { status: 500 });
      }
    }

    // 3. Excluir do banco de dados
    // ON DELETE CASCADE na FK de documentos_tags para documento_id cuidará da limpeza em documentos_tags.
    const [result]: any = await connection.execute(
      'DELETE FROM documentos WHERE id = ? AND licitacao_id = ?',
      [documentoId, licitacaoId]
    );

    // A verificação de affectedRows já foi feita implicitamente pelo select anterior.
    // Se chegou aqui e o select encontrou, o delete deve funcionar (a menos que haja deleção concorrente).
    if (result.affectedRows === 0) {
        // Isso pode acontecer se o documento foi excluído entre o SELECT e o DELETE.
        await connection.rollback();
        return NextResponse.json({ error: 'Documento não encontrado para exclusão (possivelmente já excluído)' }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ message: 'Documento excluído com sucesso do banco de dados e do storage.' });

  } catch (error: any) {
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback DELETE:", rbError));
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json(
      { error: 'Erro ao remover documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
