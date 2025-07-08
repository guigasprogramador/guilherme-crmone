// app/api/projetos/[id]/equipe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

interface EquipeMemberPayload {
  usuario_id: string; // Usado no POST para identificar o usuário a ser adicionado
  papel_no_projeto: string;
}

// GET - Listar membros da equipe de um projeto
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projeto_id } = params;
  let connection: Connection | null = null;

  if (!projeto_id) {
    return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute(
      `SELECT pe.id as equipe_rel_id, pe.papel_no_projeto, pe.data_alocacao,
              u.id as usuario_id, u.name as usuario_nome, u.email as usuario_email, u.avatar_url
       FROM projeto_equipe pe
       JOIN users u ON pe.usuario_id = u.id
       WHERE pe.projeto_id = ?
       ORDER BY u.name ASC`,
      [projeto_id]
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error(`Erro ao listar equipe do projeto ${projeto_id}:`, error);
    return NextResponse.json({ error: 'Falha ao listar equipe do projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar membro à equipe de um projeto
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projeto_id } = params;
  let connection: Connection | null = null;

  if (!projeto_id) {
    return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
  }

  try {
    const body = await request.json() as EquipeMemberPayload;

    if (!body.usuario_id || !body.papel_no_projeto) {
      return NextResponse.json({ error: 'ID do usuário e papel no projeto são obrigatórios.' }, { status: 400 });
    }

    connection = await getDbConnection();

    const [projetoRows]:any = await connection.execute('SELECT id FROM projetos WHERE id = ?', [projeto_id]);
    if (projetoRows.length === 0) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const [usuarioRows]:any = await connection.execute('SELECT id FROM users WHERE id = ?', [body.usuario_id]);
    if (usuarioRows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const equipeRelId = uuidv4();
    await connection.execute(
      `INSERT INTO projeto_equipe (id, projeto_id, usuario_id, papel_no_projeto, data_alocacao, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURDATE(), NOW(), NOW())`, // CURDATE() para data_alocacao
      [equipeRelId, projeto_id, body.usuario_id, body.papel_no_projeto]
    );

    const [newMemberRows]: any = await connection.execute(
       `SELECT pe.id as equipe_rel_id, pe.papel_no_projeto, pe.data_alocacao,
               u.id as usuario_id, u.name as usuario_nome, u.email as usuario_email, u.avatar_url
        FROM projeto_equipe pe
        JOIN users u ON pe.usuario_id = u.id
        WHERE pe.id = ?`,
       [equipeRelId]
    );

    return NextResponse.json(newMemberRows[0], { status: 201 });

  } catch (error: any) {
    console.error(`Erro ao adicionar membro à equipe do projeto ${projeto_id}:`, error);
    // ER_DUP_ENTRY é o código de erro do MySQL para violação de chave única
    if (error.code === 'ER_DUP_ENTRY' || (typeof error.message === 'string' && error.message.toLowerCase().includes('unique constraint'))) {
      return NextResponse.json({ error: 'Este usuário já faz parte da equipe deste projeto.' }, { status: 409 });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID do Projeto ou Usuário inválido.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao adicionar membro à equipe', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
