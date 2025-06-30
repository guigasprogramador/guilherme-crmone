import { NextRequest, NextResponse } from 'next/server';
// import fs from 'fs'; // REMOVED
// import path from 'path'; // REMOVED
import { v4 as uuidv4 } from 'uuid';
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from '@/lib/auth/jwt';
import { cloudinary } from '@/lib/cloudinary/config'; // ADDED

// const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/documents'); // REMOVED

// Helper function to format document for response (adjust based on actual needs)
const formatDocumentForResponse = async (connection: any, documentId: string) => {
  // This query needs to join with users, licitacoes, and aggregate tags
  const [rows]: any = await connection.execute(
    `SELECT
      d.*,
      u.name as criado_por_nome,  -- Changed from u.nome_completo
      l.titulo as licitacao_titulo,
      GROUP_CONCAT(t.nome) as tags_concatenadas
    FROM documentos d
    LEFT JOIN users u ON d.criado_por = u.id -- Changed from usuarios to users
    LEFT JOIN licitacoes l ON d.licitacao_id = l.id
    LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
    LEFT JOIN tags t ON dt.tag_id = t.id
    WHERE d.id = ?
    GROUP BY d.id`,
    [documentId]
  );
  if (rows.length > 0) {
    const doc = rows[0];
    return {
      ...doc,
      tags: doc.tags_concatenadas ? doc.tags_concatenadas.split(',') : [],
      data_criacao: new Date(doc.data_criacao).toISOString(),
      data_atualizacao: new Date(doc.data_atualizacao).toISOString(),
      data_validade: doc.data_validade ? new Date(doc.data_validade).toISOString().split('T')[0] : null,
    };
  }
  return null;
};

// Helper function for Cloudinary upload
import { UploadApiOptions } from 'cloudinary';

// Helper function for Cloudinary upload
interface CloudinaryUploadStreamOptions extends UploadApiOptions {
  // You can add any additional properties specific to your stream options if needed
}

const uploadToCloudinary = (buffer: Buffer, options: CloudinaryUploadStreamOptions): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Add access_mode: "public" to the options for upload_stream
    const streamOptions: CloudinaryUploadStreamOptions = {
      ...options,
      access_mode: "public",
      type: "upload",
      invalidate: true
    };
    const stream = cloudinary.uploader.upload_stream(streamOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

export async function POST(request: NextRequest) {
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
    const tokenPayload = await verifyJwtToken(token);
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json({ error: 'Não autorizado ou token inválido' }, { status: 401 });
    }
    const userIdFromToken = tokenPayload.userId;

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Requisição deve ser multipart/form-data' }, { status: 400 });
    }

    // REMOVED: UPLOAD_DIR logic
    // if (!fs.existsSync(UPLOAD_DIR)) {
    //   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalFilename = file.name;
    const mimeType = file.type;
    // Extract file extension for Cloudinary's format detection or specific format setting
    const fileExt = originalFilename.substring(originalFilename.lastIndexOf('.') + 1) || '';


    // --- Cloudinary Upload ---
    const cloudinaryPublicId = uuidv4();
    // Determinar o resource_type baseado no tipo de arquivo
    const isPDF = fileExt.toLowerCase() === 'pdf' || mimeType === 'application/pdf';
    const resourceType = isPDF ? 'raw' : 'auto';
    
    console.log(`Uploading file: ${originalFilename}, Type: ${mimeType}, Resource Type: ${resourceType}`);
    
    const cloudinaryResult = await uploadToCloudinary(fileBuffer, {
      folder: "crm_documents",
      public_id: cloudinaryPublicId, // Use the generated UUID for public_id
      resource_type: resourceType, // Use "raw" para PDFs, "auto" para outros
      original_filename: originalFilename // Optional: pass original filename
    });

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      // Note: If a transaction was started before this, it should be rolled back.
      // However, transaction normally starts just before DB operations.
      throw new Error('Cloudinary upload failed or did not return a secure_url.');
    }

    // --- Database Operations ---
    connection = await getDbConnection();
    await connection.beginTransaction();

    // --- Document Metadata ---
    const newDocumentId = uuidv4(); // This ID is for the database record
    const nome = formData.get('nome') as string || originalFilename;
    const tipo = formData.get('tipo') as string;
    const licitacaoId = formData.get('licitacaoId') as string | null;
    const oportunidadeId = formData.get('oportunidadeId') as string | null; // Ler oportunidadeId
    const descricao = formData.get('descricao') as string | null;
    const numeroDocumento = formData.get('numeroDocumento') as string | null;
    let dataValidade = formData.get('dataValidade') as string | null;
    const categoriaForm = formData.get('categoria') as string | null;
    const tagsString = formData.get('tags') as string | null;

    if (!tipo) {
      await connection.rollback(); // Rollback before returning error
      // No local file to unlink anymore if Cloudinary upload was first and failed,
      // or if Cloudinary succeeded but this validation failed.
      // Consider deleting from Cloudinary if this validation fails *after* successful Cloudinary upload.
      return NextResponse.json({ error: 'Campo "tipo" é obrigatório.' }, { status: 400 });
    }
    
    if (dataValidade && !/^\d{4}-\d{2}-\d{2}$/.test(dataValidade)) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataValidade)) {
            const [day, month, year] = dataValidade.split('/');
            dataValidade = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
            if (connection) await connection.rollback(); // Ensure rollback if connection was established
            // Consider deleting from Cloudinary if this validation fails *after* successful Cloudinary upload.
            return NextResponse.json({ error: 'Formato de dataValidade inválido. Use YYYY-MM-DD.' }, { status: 400 });
        }
    }

    const documentoDb = {
      id: newDocumentId,
      nome: nome,
      tipo: tipo,
      licitacao_id: licitacaoId || null,
      // oportunidade_id REMOVIDO pois não existe no banco
      criado_por: userIdFromToken,
      arquivo_path: cloudinaryResult.public_id, // Store Cloudinary public_id
      url_documento: cloudinaryResult.secure_url, // Store Cloudinary secure_url
      formato: cloudinaryResult.format || fileExt, // Use format from Cloudinary or original extension
      tamanho: cloudinaryResult.bytes || fileBuffer.length, // Use size from Cloudinary or buffer length
      status: 'ativo',
      descricao: descricao || null,
      numero_documento: numeroDocumento || null,
      data_validade: dataValidade ? new Date(dataValidade) : null,
      categoria: categoriaForm || null,
    };

    await connection.execute(
      `INSERT INTO documentos (id, nome, tipo, licitacao_id, criado_por, arquivo_path, url_documento, formato, tamanho, status, descricao, numero_documento, data_validade, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentoDb.id, documentoDb.nome, documentoDb.tipo, documentoDb.licitacao_id, documentoDb.criado_por, documentoDb.arquivo_path, documentoDb.url_documento, documentoDb.formato, documentoDb.tamanho, documentoDb.status, documentoDb.descricao, documentoDb.numero_documento, documentoDb.data_validade, documentoDb.categoria
      ]
    );

    // --- Handle Tags ---
    if (tagsString) {
      const tagNames = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (tagNames.length > 0) {
        for (const tagName of tagNames) {
          let [[tag]]: any = await connection.execute('SELECT id FROM tags WHERE nome = ?', [tagName]);
          let tagId;
          if (!tag) {
            tagId = uuidv4();
            await connection.execute('INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [tagId, tagName]);
          } else {
            tagId = tag.id;
          }
          await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocumentId, tagId]);
        }
      }
    }

    await connection.commit();
    const formattedDocument = await formatDocumentForResponse(connection, newDocumentId);

    return NextResponse.json({
      success: true,
      message: 'Documento enviado e registrado com sucesso',
      documento: formattedDocument
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro no upload:', error);
    if (connection) { // Check if connection was established before trying to rollback
      await connection.rollback();
    }
    // If Cloudinary upload failed, it would be caught here.
    // If DB operation failed after successful Cloudinary upload, the file remains in Cloudinary.
    // Implementing a Cloudinary delete here on DB error is more complex and depends on requirements.

    if (error.message.includes('Token inválido') || error.message.includes('Não autorizado')) {
        return NextResponse.json({ error: 'Não autorizado: Token inválido ou ausente.' }, { status: 401 });
    }
    if (error.code === 'ER_DUP_ENTRY') { // MySQL duplicate entry
        return NextResponse.json({ error: 'Erro de duplicidade ao inserir dados.' }, { status: 409 });
    }
    // For Cloudinary specific errors, one might check error.http_code or error.message
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}
