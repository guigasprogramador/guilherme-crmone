import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto'; // Keep for generating unique file names if needed locally

// Função auxiliar para processar a requisição multipart-form
async function processarMultipart(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const licitacaoId = formData.get('licitacaoId') as string;
    const nome = formData.get('nome') as string || file?.name || 'arquivo_sem_nome';
    const tipo = formData.get('tipo') as string || '';
    // categoriaId is deprecated, use tags
    // const categoriaId = formData.get('categoriaId') as string;
    const uploadPor = formData.get('uploadPor') as string; // User ID of uploader
    const tagsString = formData.get('tags') as string; // Comma-separated string of tag names

    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    if (!licitacaoId) {
      throw new Error('ID da licitação é obrigatório');
    }
    if (!uploadPor) {
        throw new Error('ID do usuário (uploadPor) é obrigatório');
    }
    
    const formatoArray = file.name.split('.');
    const formato = formatoArray.length > 1 ? formatoArray.pop()?.toLowerCase() : '';
    const tamanho = file.size;
    
    // O "caminho" será conceitual para o DB, já que o upload real está pendente.
    const nomeUnico = `${randomUUID()}.${formato}`;
    const caminhoConceitual = `licitacoes/${licitacaoId}/${nomeUnico}`; // Example conceptual path
    
    // Não vamos retornar o buffer do arquivo aqui, pois não faremos upload real.
    // Apenas os metadados são importantes para o registro no DB.
    
    return {
      // file: buffer, // Buffer não é mais necessário para este fluxo parcial
      caminhoConceitual,
      metadata: {
        licitacaoId,
        nome,
        tipo,
        // categoriaId, // Deprecated
        uploadPor, // User ID
        formato,
        tamanho,
        nomeOriginal: file.name,
        tags: tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      }
    };
  } catch (error) {
    console.error('Erro ao processar multipart:', error);
    throw error;
  }
}

// POST - Upload de documento (DB record creation, actual storage is placeholder)
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/licitacoes/documentos/upload - Iniciando com MySQL (armazenamento pendente)");
  try {
    const { caminhoConceitual, metadata } = await processarMultipart(request);

    // --- ARMAZENAMENTO DE ARQUIVO - PLACEHOLDER ---
    console.warn("AVISO: Upload de arquivo para armazenamento físico NÃO está implementado.");
    console.log("Dados do arquivo processado (sem upload real):", { nomeOriginal: metadata.nomeOriginal, tamanho: metadata.tamanho, formato: metadata.formato });
    const placeholderFileUrl = `pending_storage_solution/uploads/${caminhoConceitual}`;
    const placeholderFilePath = caminhoConceitual; // Usar o caminho conceitual como arquivo_path
    // --- FIM DO PLACEHOLDER DE ARMAZENAMENTO ---

    connection = await getDbConnection();
    await connection.beginTransaction();
    console.log("Transação MySQL iniciada para criar registro de documento.");

    const newDocumentId = uuidv4();
    const documentoDb = {
      id: newDocumentId,
      nome: metadata.nome,
      licitacao_id: metadata.licitacaoId,
      url_documento: placeholderFileUrl, // Placeholder
      arquivo_path: placeholderFilePath,  // Placeholder
      tipo: metadata.tipo || null,
      tamanho: metadata.tamanho || 0,
      formato: metadata.formato || null,
      criado_por: metadata.uploadPor, // FK to users.id
      status: 'ativo', // Default status
      // descricao removido pois não existe na interface Documento
      // categoria (legacy single category) and categoria_id are not used in favor of tags
    };

    const docFields = Object.keys(documentoDb);
    const docPlaceholders = docFields.map(() => '?').join(', ');
    const docValues = Object.values(documentoDb);

    const sqlInsertDoc = `INSERT INTO documentos (${docFields.join(', ')}, data_criacao, data_atualizacao) VALUES (${docPlaceholders}, NOW(), NOW())`;
    await connection.execute(sqlInsertDoc, docValues);
    console.log("Registro de documento inserido no DB com ID:", newDocumentId);

    // Lidar com Tags
    const createdTagsForDocument: { id: string, nome: string }[] = [];
    if (metadata.tags && metadata.tags.length > 0) {
      for (const tagName of metadata.tags) {
        let [tagRows]: any = await connection.execute('SELECT id, nome FROM tags WHERE nome = ?', [tagName]);
        let tagId;
        let currentTagName = tagName;

        if (tagRows.length > 0) {
          tagId = tagRows[0].id;
          currentTagName = tagRows[0].nome; // Use o nome exato do DB
        } else {
          tagId = uuidv4();
          await connection.execute('INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [tagId, tagName]);
          console.log(`Nova tag '${tagName}' criada com ID: ${tagId}`);
        }
        await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocumentId, tagId]);
        createdTagsForDocument.push({ id: tagId, nome: currentTagName });
      }
      console.log("Tags associadas ao documento ID:", newDocumentId);
    }

    await connection.commit();
    console.log("Transação MySQL commitada.");

    // Formatar e retornar o documento criado (com uploader e tags)
    // Simular a estrutura que seria retornada por uma query completa
    const [uploaderRows]: any = await connection.execute('SELECT name FROM users WHERE id = ?', [metadata.uploadPor]);
    const uploaderName = uploaderRows.length > 0 ? uploaderRows[0].name : 'Desconhecido';

    const documentoFormatado = {
      id: newDocumentId,
      nome: metadata.nome,
      url: placeholderFileUrl,
      arquivo: placeholderFilePath,
      licitacaoId: metadata.licitacaoId,
      tipo: metadata.tipo,
      tamanho: metadata.tamanho,
      formato: metadata.formato,
      uploadPor: uploaderName, // Nome do uploader
      criadoPorId: metadata.uploadPor, // ID do uploader
      status: 'ativo',
      dataCriacao: new Date().toISOString(), // Aproximação
      dataAtualizacao: new Date().toISOString(), // Aproximação
      tags: Array.isArray(createdTagsForDocument) ? createdTagsForDocument : [],
      // descricao removido pois não existe na interface Documento
    };
    
    return NextResponse.json(documentoFormatado, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao processar upload de documento (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    return NextResponse.json(
      { error: 'Erro ao processar upload: ' + error.message, details: error.code || 'N/A' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir documento
export async function DELETE(request: NextRequest) {
  let connection;
  console.log("DELETE /api/licitacoes/documentos/upload - Iniciando exclusão com MySQL (DB record only)");
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // ID do documento
    
    if (!id) {
      return NextResponse.json({ error: 'ID do documento é obrigatório' }, { status: 400 });
    }
    
    // --- REMOÇÃO DE ARQUIVO DO STORAGE - PLACEHOLDER ---
    // A lógica para buscar o `arquivo_path` do DB e deletar o arquivo do storage real
    // precisará ser implementada aqui quando a nova solução de storage estiver pronta.
    console.warn(`AVISO: Remoção de arquivo do storage para documento ID ${id} NÃO está implementada.`);
    // --- FIM DO PLACEHOLDER ---

    connection = await getDbConnection();
    // ON DELETE CASCADE na tabela `documentos_tags` deve cuidar da limpeza das associações de tags.
    const [result]: any = await connection.execute('DELETE FROM documentos WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Documento não encontrado no banco de dados' }, { status: 404 });
    }
    
    console.log("Registro do documento ID:", id, "excluído do DB com sucesso.");
    return NextResponse.json({ 
      success: true, 
      message: 'Registro do documento excluído com sucesso (armazenamento de arquivo pendente).'
    });

  } catch (error: any) {
    console.error('Erro ao excluir documento (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir documento: ' + error.message },
      { status: 500 }
    );
  }
}
