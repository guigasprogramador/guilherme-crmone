import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';

interface TarefaUpdatePayload {
  titulo_tarefa?: string;
  descricao_tarefa?: string | null;
  status_tarefa?: string;
  responsavel_tarefa_id?: string | null;
  data_inicio_prevista_tarefa?: string | null;
  data_fim_prevista_tarefa?: string | null;
  data_conclusao_tarefa?: string | null;
  horas_estimadas?: number | null;
  horas_realizadas?: number | null;
  prioridade?: number | null;
  depende_de_tarefa_id?: string | null;
}

// Função para recalcular o progresso do projeto (reutilizada)
async function recalcularProgressoProjeto(projetoId: string, connection: Connection) {
  try {
    const [tarefas]: any = await connection.execute(
      'SELECT status_tarefa, horas_estimadas FROM projeto_tarefas WHERE projeto_id = ?',
      [projetoId]
    );
    if (tarefas.length === 0) {
      await connection.execute('UPDATE projetos SET percentual_concluido = 0, updated_at = NOW() WHERE id = ?', [projetoId]);
      return;
    }
    let totalHorasEstimadas = 0;
    let horasConcluidas = 0;
    tarefas.forEach((tarefa: any) => {
      const horasEstimadasItem = Number(tarefa.horas_estimadas) || 0;
      totalHorasEstimadas += horasEstimadasItem;
      if (tarefa.status_tarefa === 'CONCLUIDA' && horasEstimadasItem > 0) {
        horasConcluidas += horasEstimadasItem;
      }
    });
    const percentualConcluido = totalHorasEstimadas > 0 ? Math.round((horasConcluidas / totalHorasEstimadas) * 100) : 0;
    await connection.execute(
      'UPDATE projetos SET percentual_concluido = ?, updated_at = NOW() WHERE id = ?',
      [Math.min(100, percentualConcluido), projetoId]
    );
    console.log(`Progresso do projeto ${projetoId} recalculado para ${percentualConcluido}%`);
  } catch (error) {
    console.error(`Erro ao recalcular progresso do projeto ${projetoId}:`, error);
  }
}

// GET - Buscar tarefa por ID
export async function GET(request: NextRequest, { params }: { params: { id: string, tarefaId: string } }) {
  const { id: projeto_id, tarefaId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();
    const [rows]: any = await connection.execute(
      `SELECT pt.*, u.name as responsavel_tarefa_nome
       FROM projeto_tarefas pt
       LEFT JOIN users u ON pt.responsavel_tarefa_id = u.id
       WHERE pt.id = ? AND pt.projeto_id = ?`,
      [tarefaId, projeto_id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tarefa não encontrada ou não pertence a este projeto.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error(`Erro ao buscar tarefa ${tarefaId}:`, error);
    return NextResponse.json({ error: 'Falha ao buscar tarefa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar tarefa completa
export async function PUT(request: NextRequest, { params }: { params: { id: string, tarefaId: string } }) {
  const { id: projeto_id, tarefaId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as TarefaUpdatePayload;

    if (!body.titulo_tarefa) {
        return NextResponse.json({ error: 'Título da tarefa é obrigatório.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const camposParaAtualizar: Partial<TarefaUpdatePayload> = {};
    const camposPermitidos: (keyof TarefaUpdatePayload)[] = [
        'titulo_tarefa', 'descricao_tarefa', 'status_tarefa', 'responsavel_tarefa_id',
        'data_inicio_prevista_tarefa', 'data_fim_prevista_tarefa', 'data_conclusao_tarefa',
        'horas_estimadas', 'horas_realizadas', 'prioridade', 'depende_de_tarefa_id'
    ];

    for (const key of camposPermitidos) {
        if (body[key] !== undefined) {
            (camposParaAtualizar as any)[key] = body[key];
        }
    }

    if (Object.keys(camposParaAtualizar).length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    const updateFields = Object.keys(camposParaAtualizar).map(key => `${key} = ?`).join(', ');
    const updateValues = [...Object.values(camposParaAtualizar), tarefaId, projeto_id];

    const [result]:any = await connection.execute(
      `UPDATE projeto_tarefas SET ${updateFields}, updated_at = NOW() WHERE id = ? AND projeto_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Tarefa não encontrada ou não pertence a este projeto.' }, { status: 404 });
    }

    await recalcularProgressoProjeto(projeto_id, connection);
    await connection.commit();

    const [updatedTarefaRows]: any = await connection.execute(
         `SELECT pt.*, u.name as responsavel_tarefa_nome
          FROM projeto_tarefas pt
          LEFT JOIN users u ON pt.responsavel_tarefa_id = u.id
          WHERE pt.id = ?`, [tarefaId]);
    return NextResponse.json(updatedTarefaRows[0]);

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`Erro ao atualizar tarefa ${tarefaId}:`, error);
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID de referência inválido (Responsável ou Tarefa Dependente).' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao atualizar tarefa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Atualizar campos parciais da tarefa (ex: status, horas_realizadas)
export async function PATCH(request: NextRequest, { params }: { params: { id: string, tarefaId: string } }) {
  const { id: projeto_id, tarefaId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as Partial<TarefaUpdatePayload>;

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const camposPermitidosPatch: (keyof TarefaUpdatePayload)[] = [
        'titulo_tarefa', 'descricao_tarefa', 'status_tarefa', 'responsavel_tarefa_id',
        'data_inicio_prevista_tarefa', 'data_fim_prevista_tarefa', 'data_conclusao_tarefa',
        'horas_estimadas', 'horas_realizadas', 'prioridade', 'depende_de_tarefa_id'
    ];
    const camposParaAtualizarPatch: Partial<TarefaUpdatePayload> = {};
    for(const key of camposPermitidosPatch){
        if(body[key] !== undefined){
            (camposParaAtualizarPatch as any)[key] = body[key];
        }
    }

    if (Object.keys(camposParaAtualizarPatch).length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Nenhum campo válido fornecido para atualização PATCH.' }, { status: 400 });
    }

    const updateFields = Object.keys(camposParaAtualizarPatch).map(key => `${key} = ?`).join(', ');
    const updateValues = [...Object.values(camposParaAtualizarPatch), tarefaId, projeto_id];

    const [result]:any = await connection.execute(
      `UPDATE projeto_tarefas SET ${updateFields}, updated_at = NOW() WHERE id = ? AND projeto_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Tarefa não encontrada ou não pertence a este projeto.' }, { status: 404 });
    }

    if (body.status_tarefa !== undefined || body.horas_realizadas !== undefined || body.horas_estimadas !== undefined) {
        await recalcularProgressoProjeto(projeto_id, connection);
    }
    await connection.commit();

    const [updatedTarefaRows]: any = await connection.execute(
         `SELECT pt.*, u.name as responsavel_tarefa_nome
          FROM projeto_tarefas pt
          LEFT JOIN users u ON pt.responsavel_tarefa_id = u.id
          WHERE pt.id = ?`, [tarefaId]);
    return NextResponse.json(updatedTarefaRows[0]);

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`Erro ao atualizar parcialmente tarefa ${tarefaId}:`, error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID de referência inválido (Responsável ou Tarefa Dependente).' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao atualizar parcialmente tarefa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir tarefa
export async function DELETE(request: NextRequest, { params }: { params: { id: string, tarefaId: string } }) {
  const { id: projeto_id, tarefaId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [result]:any = await connection.execute(
      'DELETE FROM projeto_tarefas WHERE id = ? AND projeto_id = ?',
      [tarefaId, projeto_id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Tarefa não encontrada ou não pertence a este projeto.' }, { status: 404 });
    }

    await recalcularProgressoProjeto(projeto_id, connection);
    await connection.commit();

    return NextResponse.json({ message: 'Tarefa excluída com sucesso.' });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`Erro ao excluir tarefa ${tarefaId}:`, error);
    return NextResponse.json({ error: 'Falha ao excluir tarefa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
