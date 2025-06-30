import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDbConnection } from '@/lib/mysql/client'; // Adjusted path
import { verifyJwtToken } from '@/lib/auth/jwt'; // Adjusted path

// Mapping for common MIME types based on file extension (format)
const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  zip: 'application/zip',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let connection;

  try {
    // 1. Authentication
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for GET /api/documentos/doc/[id]/download");
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const tokenPayload = await verifyJwtToken(token); // Assuming verifyJwtToken takes a token string
    if (!tokenPayload) { // verifyJwtToken might return null or throw, so check payload
      return NextResponse.json({ error: 'Não autorizado ou token inválido' }, { status: 401 });
    }

    // 2. Fetch Document Metadata
    connection = await getDbConnection();
    const [rows]: any = await connection.execute(
      'SELECT nome, arquivo_path, formato FROM documentos WHERE id = ? AND status = ?',
      [id, 'ativo'] // Ensure document is active
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Documento não encontrado ou acesso negado.' }, { status: 404 });
    }
    const doc = rows[0];

    if (!doc.arquivo_path) {
      return NextResponse.json({ error: 'Caminho do arquivo não definido para este documento.' }, { status: 404 });
    }

    // 3. File System Interaction
    // Assuming arquivo_path is stored relative to 'public/', e.g., 'uploads/documents/filename.ext'
    const fullFilePath = path.join(process.cwd(), 'public', doc.arquivo_path);

    if (!fs.existsSync(fullFilePath)) {
      console.error(`File not found at path: ${fullFilePath} (DB arquivo_path: ${doc.arquivo_path})`);
      return NextResponse.json({ error: 'Arquivo não encontrado no servidor.' }, { status: 404 });
    }

    const stats = fs.statSync(fullFilePath);
    const fileSize = stats.size;

    // 4. Response Headers
    const headers = new Headers();
    // Sanitize filename - basic example, might need more robust solution for complex names
    const safeFilename = doc.nome.replace(/[^a-zA-Z0-9._-]/g, '_');
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);

    const contentType = mimeTypes[doc.formato?.toLowerCase() || ''] || 'application/octet-stream';
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileSize.toString());

    // 5. Stream File
    const fileStream = fs.createReadStream(fullFilePath);

    // NextResponse can take a ReadableStream directly.
    // The 'as any' might be needed if TypeScript types conflict, but often not necessary with Node.js ReadableStream.
    return new NextResponse(fileStream as any, { headers, status: 200 });

  } catch (error: any) {
    console.error('Erro no download do documento:', error);
    if (error.message.includes('Token inválido') || error.message.includes('Não autorizado')) {
        return NextResponse.json({ error: 'Não autorizado: Token inválido ou expirado.' }, { status: 401 });
    }
    if (error.code === 'ENOENT') { // File not found error from fs operations
        return NextResponse.json({ error: 'Arquivo não encontrado no servidor.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o download.', details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}
