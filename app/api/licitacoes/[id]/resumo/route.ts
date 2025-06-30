import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Obter o resumo de uma licitação
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id é licitacaoId
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`GET /api/licitacoes/${licitacaoId}/resumo - Iniciando consulta com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    const sql = 'SELECT id, licitacao_id, conteudo, pontos_importantes, created_at, updated_at FROM licitacao_resumos WHERE licitacao_id = ?';
    const [rows]: any = await connection.execute(sql, [licitacaoId]);
    
    if (rows.length === 0) {
      // Retornar objeto vazio com status 200, conforme lógica original
      return NextResponse.json({
        licitacao_id: licitacaoId,
        conteudo: '',
        pontos_importantes: []
      });
    }
    
    // MySQL JSON type is automatically parsed by some drivers, or returned as string.
    // NextResponse.json will handle stringifying it correctly if it's an object/array.
    // If pontos_importantes is a string, try to parse.
    const resumo = rows[0];
    if (typeof resumo.pontos_importantes === 'string') {
      try {
        resumo.pontos_importantes = JSON.parse(resumo.pontos_importantes);
      } catch (parseError) {
        console.error("Erro ao parsear pontos_importantes:", parseError);
        resumo.pontos_importantes = []; // Fallback to empty array on parse error
      }
    }

    return NextResponse.json(resumo);

  } catch (error: any) {
    console.error('Erro ao buscar resumo (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar resumo da licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar um novo resumo para uma licitação
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id é licitacaoId
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`POST /api/licitacoes/${licitacaoId}/resumo - Iniciando criação com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
  }

  try {
    const data = await request.json();
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Verificar se já existe um resumo para esta licitação
    const [existingRows]: any = await connection.execute(
      'SELECT id FROM licitacao_resumos WHERE licitacao_id = ?',
      [licitacaoId]
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Já existe um resumo para esta licitação. Use PUT para atualizar.' },
        { status: 400 } // Ou 409 Conflict
      );
    }
    
    const newResumoId = uuidv4();
    const conteudo = data.conteudo || '';
    const pontosImportantes = JSON.stringify(data.pontos_importantes || []);
    
    const sqlInsert = 'INSERT INTO licitacao_resumos (id, licitacao_id, conteudo, pontos_importantes, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())';
    await connection.execute(sqlInsert, [newResumoId, licitacaoId, conteudo, pontosImportantes]);
    
    await connection.commit();
    console.log("Novo resumo criado com ID:", newResumoId, "para licitação ID:", licitacaoId);

    const [createdRows]: any = await connection.execute('SELECT * FROM licitacao_resumos WHERE id = ?', [newResumoId]);
    const resumoCriado = createdRows[0];
    if (typeof resumoCriado.pontos_importantes === 'string') {
        resumoCriado.pontos_importantes = JSON.parse(resumoCriado.pontos_importantes);
    }
    return NextResponse.json(resumoCriado, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao adicionar resumo (MySQL):', error);
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback:", rbError));
    return NextResponse.json(
      { error: 'Erro ao adicionar resumo à licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar o resumo de uma licitação (Upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id é licitacaoId
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`PUT /api/licitacoes/${licitacaoId}/resumo - Iniciando upsert com MySQL`);

  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
  }

  try {
    const data = await request.json();
    connection = await getDbConnection();
    
    const newResumoId = uuidv4(); // Para o caso de INSERT
    const conteudo = data.conteudo || '';
    const pontosImportantes = JSON.stringify(data.pontos_importantes || []);

    const sqlUpsert = `
      INSERT INTO licitacao_resumos (id, licitacao_id, conteudo, pontos_importantes, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      conteudo = VALUES(conteudo),
      pontos_importantes = VALUES(pontos_importantes),
      updated_at = NOW()
    `;
    
    // Para ON DUPLICATE KEY UPDATE, o ID no VALUES() é o que seria inserido.
    // Se a chave duplicada (licitacao_id) for encontrada, o UPDATE ocorre.
    // O ID da linha não muda no UPDATE.
    await connection.execute(sqlUpsert, [newResumoId, licitacaoId, conteudo, pontosImportantes]);
    console.log("Resumo atualizado/inserido para licitação ID:", licitacaoId);

    const [updatedRows]: any = await connection.execute('SELECT * FROM licitacao_resumos WHERE licitacao_id = ?', [licitacaoId]);
    const resumoAtualizado = updatedRows[0];
     if (typeof resumoAtualizado.pontos_importantes === 'string') {
        resumoAtualizado.pontos_importantes = JSON.parse(resumoAtualizado.pontos_importantes);
    }
    return NextResponse.json(resumoAtualizado);

  } catch (error: any) {
    console.error('Erro ao processar atualização de resumo (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar resumo' },
      { status: 500 }
    );
  }
}