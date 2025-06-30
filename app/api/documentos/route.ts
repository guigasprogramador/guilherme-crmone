import { NextRequest, NextResponse } from 'next/server';
// import { Documento } from '@/types/licitacoes'; // Type might need adjustment
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { verifyJwtToken } from "@/lib/auth/jwt";

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
// Similar to the one in ./doc/route.ts
function formatarDocumentoMySQL(item: any): any {
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
    categoriaLegado: item.categoria, // Changed from item.categoria_legado
    tags: item.tags_concatenadas ? item.tags_concatenadas.split(', ') : [],
  };
}

// GET - Listar todos os documentos ou filtrar
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/documentos - Iniciando consulta com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for GET /api/documentos");
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

    const termo = searchParams.get('termo');
    if (termo) { conditions.push('d.nome LIKE ?'); paramsSql.push(`%${termo}%`); }
    
    const tipo = searchParams.get('tipo');
    if (tipo && tipo !== 'todos') { conditions.push('d.tipo = ?'); paramsSql.push(tipo); }
    
    const licitacaoId = searchParams.get('licitacaoId');
    if (licitacaoId && licitacaoId !== 'todos') { conditions.push('d.licitacao_id = ?'); paramsSql.push(licitacaoId); }
    
    const dataInicio = searchParams.get('dataInicio');
    if (dataInicio) { conditions.push('d.data_criacao >= ?'); paramsSql.push(new Date(dataInicio).toISOString().split('T')[0]); }
    
    const dataFim = searchParams.get('dataFim');
    if (dataFim) { conditions.push('d.data_criacao <= ?'); paramsSql.push(new Date(dataFim).toISOString().split('T')[0]); }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY d.id ORDER BY d.data_criacao DESC';
    
    console.log("Executando SQL GET Documentos (geral):", sql, paramsSql);
    const [rows] = await connection.execute(sql, paramsSql);
    
    const documentos = (rows as any[]).map(formatarDocumentoMySQL);
    return NextResponse.json(documentos);

  } catch (error: any) {
    console.error('Erro ao listar documentos (MySQL):', error);
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao listar documentos', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar novo documento (metadata)
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/documentos - Iniciando criação de metadados de documento com MySQL");
  try {
    let token = request.cookies.get('accessToken')?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      console.log("Token not found in cookie, attempting to use Authorization header for POST /api/documentos");
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

    const data = await request.json();
    console.log("Dados recebidos para novo documento (metadata):", data);
    
    if (!data.nome || !data.tipo) {
      return NextResponse.json({ error: 'Nome e tipo são campos obrigatórios' }, { status: 400 });
    }
    // licitacaoId é opcional aqui, mas criadoPor deve vir do token
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const newDocumentId = uuidv4();
    const placeholderUrl = `pending_storage_solution/general_docs/${newDocumentId}/${data.nome}`;
    const placeholderPath = `general_docs/${newDocumentId}/${data.nome}`;
    console.warn(`AVISO: Upload de arquivo real não implementado. Usando placeholders: URL=${placeholderUrl}, Path=${placeholderPath}`);

    const documentoDb = {
      id: newDocumentId,
      nome: data.nome,
      licitacao_id: data.licitacaoId || null,
      tipo: data.tipo,
      descricao: data.descricao || null,
      numero_documento: data.numeroDocumento || null,
      data_validade: data.dataValidade ? new Date(data.dataValidade).toISOString().split('T')[0] : null,
      url_documento: placeholderUrl,
      arquivo_path: placeholderPath,
      formato: data.formato || null,
      tamanho: data.tamanho || 0,
      status: data.status || 'ativo',
      criado_por: userIdFromToken,
      categoria: data.categoriaLegado || null,
    };
    
    const fields = Object.keys(documentoDb);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(documentoDb);

    const sqlInsert = `INSERT INTO documentos (${fields.join(', ')}, data_criacao, data_atualizacao) VALUES (${placeholders}, NOW(), NOW())`;
    await connection.execute(sqlInsert, values);
    console.log("Metadados do documento inseridos com ID:", newDocumentId);

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
    
    return NextResponse.json(formatarDocumentoMySQL(createdDocRows[0]), { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar documento (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao criar documento' },
      { status: 500 }
    );
  }
}
