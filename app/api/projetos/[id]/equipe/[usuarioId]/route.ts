import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';

interface EquipeUpdatePayload {
  papel_no_projeto: string;
}

// PUT ou PATCH - Atualizar o papel de um membro na equipe
export async function PUT(request: NextRequest, { params }: { params: { id: string, usuarioId: string } }) {
  const { id: projeto_id, usuarioId: usuario_id } = params; // id é projeto_id
  let connection: Connection | null = null;

  if (!projeto_id || !usuario_id) {
    return NextResponse.json({ error: 'ID do projeto e ID do usuário são obrigatórios.' }, { status: 400 });
  }

  try {
    const body = await request.json() as EquipeUpdatePayload;

    if (!body.papel_no_projeto || typeof body.papel_no_projeto !== 'string' || body.papel_no_projeto.trim() === "") {
      return NextResponse.json({ error: 'O campo papel_no_projeto é obrigatório e não pode ser vazio para atualização.' }, { status: 400 });
    }

    connection = await getDbConnection();
    const [result]: any = await connection.execute(
      'UPDATE projeto_equipe SET papel_no_projeto = ?, updated_at = NOW() WHERE projeto_id = ? AND usuario_id = ?',
      [body.papel_no_projeto.trim(), projeto_id, usuario_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Membro da equipe não encontrado neste projeto para atualizar ou papel não alterado.' }, { status: 404 });
    }

    // Retornar o registro atualizado com detalhes do usuário
     const [updatedMemberRows]: any = await connection.execute(
       `SELECT pe.id as equipe_rel_id, pe.papel_no_projeto, pe.data_alocacao,
               u.id as usuario_id, u.name as usuario_nome, u.email as usuario_email, u.avatar_url
        FROM projeto_equipe pe
        JOIN users u ON pe.usuario_id = u.id
        WHERE pe.projeto_id = ? AND pe.usuario_id = ?`,
       [projeto_id, usuario_id]
    );

    if (updatedMemberRows.length === 0) { // Deve encontrar se affectedRows > 0
        return NextResponse.json({ error: 'Falha ao buscar membro da equipe após atualização.' }, { status: 500 });
    }

    return NextResponse.json(updatedMemberRows[0]);

  } catch (error: any) {
    console.error(`Erro ao atualizar papel do membro ${usuario_id} no projeto ${projeto_id}:`, error);
    return NextResponse.json({ error: 'Falha ao atualizar papel do membro na equipe', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// Alias PATCH to PUT
export { PUT as PATCH };


// DELETE - Remover membro da equipe de um projeto
export async function DELETE(request: NextRequest, { params }: { params: { id: string, usuarioId: string } }) {
  const { id: projeto_id, usuarioId: usuario_id } = params; // id é projeto_id
  let connection: Connection | null = null;

  if (!projeto_id || !usuario_id) {
    return NextResponse.json({ error: 'ID do projeto e ID do usuário são obrigatórios.' }, { status: 400 });
  }

  try {
    connection = await getDbConnection();
    const [result]: any = await connection.execute(
      'DELETE FROM projeto_equipe WHERE projeto_id = ? AND usuario_id = ?',
      [projeto_id, usuario_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Membro da equipe não encontrado neste projeto para remover.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Membro removido da equipe com sucesso.' }, { status: 200 }); // 200 OK com mensagem ou 204 No Content

  } catch (error: any) {
    console.error(`Erro ao remover membro ${usuario_id} da equipe do projeto ${projeto_id}:`, error);
    return NextResponse.json({ error: 'Falha ao remover membro da equipe', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
