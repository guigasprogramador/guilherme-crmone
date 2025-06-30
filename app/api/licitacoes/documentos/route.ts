import { NextRequest, NextResponse } from 'next/server';
import { DocumentoDetalhado } from '@/types/licitacoes';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY (se necessário para frontend)
function formatDateToDDMMYYYY(dateString: string | null): string | undefined {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    // Ajuste para UTC para evitar problemas de fuso horário ao formatar
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
}

// Função auxiliar para formatar o documento no formato esperado pelo frontend
function formatarDocumentoMySQL(item: any): DocumentoDetalhado {
  return {
    id: item.id,
    nome: item.nome,
    url: item.url_documento, // snake_case from DB
    arquivo: item.arquivo_path, // snake_case from DB
    licitacaoId: item.licitacao_id,
    tipo: item.tipo,
    tamanho: item.tamanho,
    formato: item.formato,
    tags: item.tags_concatenadas ? item.tags_concatenadas.split(', ') : [],
    uploadPor: item.criado_por, // FK to users.id
    // uploaderName: item.uploader_name, // Se fizer join com users na query GET e precisar do nome
    resumo: item.descricao, // Mapeando `descricao` do DB para `resumo` se for o caso, ou adicionar `resumo` ao select
    dataValidade: formatDateToDDMMYYYY(item.data_validade),
    status: item.status,
    licitacao: item.licitacao_titulo, // Do join com licitacoes
    dataCriacao: item.data_criacao, // Mantém como ISO string ou Date object
    dataAtualizacao: item.data_atualizacao, // Mantém como ISO string ou Date object
    // Campos adicionais do DDL de documentos
    numeroDocumento: item.numero_documento,
    categoriaLegado: item.categoria, // Campo legado `categoria` da tabela documentos
  };
}

// GET - Listar documentos com filtros
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/licitacoes/documentos - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();
    
    const licitacaoId = searchParams.get('licitacaoId');
    const tipo = searchParams.get('tipo');
    const tagNome = searchParams.get('tagNome'); // Novo filtro por nome da tag

    let sql = `
      SELECT
          d.id, d.nome, d.tipo, d.url_documento, d.arquivo_path, d.formato,
          d.tamanho, d.status, d.criado_por, d.data_criacao, d.data_atualizacao,
          d.licitacao_id, l.titulo as licitacao_titulo,
          d.descricao, d.numero_documento, d.data_validade, d.categoria,
          (SELECT GROUP_CONCAT(t.nome SEPARATOR ', ')
           FROM tags t
           JOIN documentos_tags dt ON t.id = dt.tag_id
           WHERE dt.documento_id = d.id) as tags_concatenadas
      FROM documentos d
      LEFT JOIN licitacoes l ON d.licitacao_id = l.id
    `;
    const conditions: string[] = [];
    const paramsSql: any[] = [];

    if (licitacaoId) {
      conditions.push('d.licitacao_id = ?');
      paramsSql.push(licitacaoId);
    }
    if (tipo) {
      conditions.push('d.tipo = ?');
      paramsSql.push(tipo);
    }
    if (tagNome) {
      // Filtrar por documentos que têm uma tag específica com o nome fornecido
      conditions.push('EXISTS (SELECT 1 FROM documentos_tags dt_filter JOIN tags t_filter ON dt_filter.tag_id = t_filter.id WHERE dt_filter.documento_id = d.id AND t_filter.nome = ?)');
      paramsSql.push(tagNome);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY d.id ORDER BY d.data_criacao DESC';
    
    console.log("Executando SQL:", sql, paramsSql);
    const [rows] = await connection.execute(sql, paramsSql);
    
    const documentos = (rows as any[]).map(formatarDocumentoMySQL);
    return NextResponse.json(documentos);

  } catch (error: any) {
    console.error('Erro ao listar documentos (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao listar documentos', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar novo documento (metadata record, simplified)
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/licitacoes/documentos - Iniciando criação de metadados de documento com MySQL");
  try {
    const data = await request.json();
    console.log("Dados recebidos para novo documento (metadata):", data);
    
    if (!data.nome || !data.licitacaoId) {
      return NextResponse.json({ error: 'Nome do documento e ID da licitação são obrigatórios' }, { status: 400 });
    }
     if (!data.criadoPor) { // User ID of who is creating/uploading
      return NextResponse.json({ error: 'ID do usuário criador (criadoPor) é obrigatório' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    const newDocumentId = uuidv4();

    // Placeholders for actual file storage URLs/paths
    const placeholderUrl = 'pending_storage_solution/file_url/' + newDocumentId;
    const placeholderPath = 'pending_storage_solution/file_path/' + newDocumentId;
    console.warn(`AVISO: Upload de arquivo real não implementado. Usando placeholders: URL=${placeholderUrl}, Path=${placeholderPath}`);

    const documentoDb = {
      id: newDocumentId,
      nome: data.nome,
      licitacao_id: data.licitacaoId,
      tipo: data.tipo || 'Outro',
      resumo: data.resumo || data.descricao || null, // Prioritize resumo, fallback to descricao if provided
      status: data.status || 'ativo',
      criado_por: data.criadoPor,
      url_documento: placeholderUrl,
      arquivo_path: placeholderPath,
      formato: data.formato || null,
      tamanho: data.tamanho || 0,
      numero_documento: data.numeroDocumento || null,
      data_validade: data.dataValidade ? new Date(data.dataValidade).toISOString().split('T')[0] : null,
      categoria: data.categoriaLegado || null, // Legacy categoria field
      // Tags are not handled in this simplified POST. They should be added via specific document update or upload route.
    };

    const fields = Object.keys(documentoDb);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(documentoDb);

    const sqlInsert = `INSERT INTO documentos (${fields.join(', ')}, data_criacao, data_atualizacao) VALUES (${placeholders}, NOW(), NOW())`;
    await connection.execute(sqlInsert, values);
    console.log("Metadados do documento inseridos com ID:", newDocumentId);

    // Fetch the newly created document record along with licitacao_titulo for response consistency
    const [createdDocRows]: any = await connection.execute(
      `SELECT d.*, l.titulo as licitacao_titulo, NULL as tags_concatenadas
       FROM documentos d
       LEFT JOIN licitacoes l ON d.licitacao_id = l.id
       WHERE d.id = ?`,
      [newDocumentId]
    );

    if (createdDocRows.length === 0) {
      return NextResponse.json({ error: "Falha ao recuperar metadados do documento recém-criado" }, { status: 500 });
    }
    
    return NextResponse.json(formatarDocumentoMySQL(createdDocRows[0]), { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar metadados de documento (MySQL):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro no rollback:", rbError));
    return NextResponse.json(
      { error: 'Erro ao criar metadados de documento', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
