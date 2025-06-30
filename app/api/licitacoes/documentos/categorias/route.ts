import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Listar "categorias" de documentos (agora tags)
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/licitacoes/documentos/categorias - Iniciando consulta de tags com MySQL");
  try {
    connection = await getDbConnection();
    
    // A tabela `tags` não possui filtro de 'ativo'.
    // Selecionamos os campos relevantes da tabela `tags`.
    const sql = 'SELECT id, nome, created_at, updated_at FROM tags ORDER BY nome ASC';
    console.log("Executando SQL:", sql);
    const [rows] = await connection.execute(sql);
    
    const tags = (rows as any[]).map(tag => ({
      id: tag.id,
      nome: tag.nome,
      // Os campos descricao, ativo, cor, icone não existem na tabela 'tags'
      // Se o frontend espera esses campos, precisará ser ajustado ou eles podem ser retornados como null/default.
      descricao: null,
      ativo: true, // Assumindo que todas as tags listadas estão 'ativas' por padrão.
      cor: null,
      icone: null,
      dataCriacao: tag.created_at, // Mapeando para manter consistência com a resposta anterior, se possível
      dataAtualizacao: tag.updated_at, // Mapeando para manter consistência
    }));
    
    return NextResponse.json(tags);

  } catch (error: any) {
    console.error('Erro ao listar tags (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao listar tags', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Tags).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Tags):", releaseError.message);
      }
    }
  }
}

// POST - Criar nova "categoria" de documento (agora tag)
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/licitacoes/documentos/categorias - Iniciando criação de tag com MySQL");
  try {
    const data = await request.json();
    console.log("Dados recebidos para nova tag:", data);

    if (!data.nome || String(data.nome).trim() === '') {
      return NextResponse.json({ error: 'Nome da tag é obrigatório' }, { status: 400 });
    }
    
    const newTagId = uuidv4();
    const tagName = String(data.nome).trim();
    // Outros campos como descricao, ativo, cor, icone são ignorados pois não existem na tabela `tags`.
    
    connection = await getDbConnection();
    
    try {
      const sqlInsert = 'INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())';
      await connection.execute(sqlInsert, [newTagId, tagName]);
      console.log("Nova tag criada com ID:", newTagId);
    } catch (dbError: any) {
      if (dbError.code === 'ER_DUP_ENTRY') { // Código de erro do MySQL para entrada duplicada
        console.warn("Tentativa de criar tag duplicada com nome:", tagName);
        return NextResponse.json({ error: `A tag '${tagName}' já existe.` }, { status: 409 }); // Conflict
      }
      throw dbError; // Re-lançar outros erros de DB
    }

    // Para retornar o objeto completo incluindo timestamps gerados pelo DB:
    const [createdRows]: any = await connection.execute('SELECT id, nome, created_at, updated_at FROM tags WHERE id = ?', [newTagId]);
    if (createdRows.length === 0) {
        return NextResponse.json({ error: "Falha ao recuperar tag recém-criada" }, { status: 500 });
    }
    
    const tagCriada = createdRows[0];
    const tagFormatada = {
      id: tagCriada.id,
      nome: tagCriada.nome,
      descricao: null, // Campo não existe na tabela tags
      ativo: true,     // Assumindo ativa por default
      cor: null,       // Campo não existe na tabela tags
      icone: null,     // Campo não existe na tabela tags
      dataCriacao: tagCriada.created_at,
      dataAtualizacao: tagCriada.updated_at
    };
    
    return NextResponse.json(tagFormatada, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar tag (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar categoria de documento' },
      { status: 500 }
    );
  }
}
