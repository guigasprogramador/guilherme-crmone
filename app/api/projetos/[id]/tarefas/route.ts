import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

interface TarefaPayload {
  titulo_tarefa: string;
  descricao_tarefa?: string | null;
  status_tarefa?: string;
  responsavel_tarefa_id?: string | null;
  data_inicio_prevista_tarefa?: string | null; // YYYY-MM-DD
  data_fim_prevista_tarefa?: string | null;   // YYYY-MM-DD
  horas_estimadas?: number | null;
  prioridade?: number | null;
  depende_de_tarefa_id?: string | null;
}

// Função para recalcular o progresso do projeto (simplificada)
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projeto_id } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as TarefaPayload;

    if (!projeto_id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
    }
    if (!body.titulo_tarefa) {
      return NextResponse.json({ error: 'Título da tarefa é obrigatório.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const [projetoRows]:any = await connection.execute('SELECT id FROM projetos WHERE id = ?', [projeto_id]);
    if (projetoRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    const tarefaId = uuidv4();
    const tarefaData = {
      id: tarefaId,
      projeto_id,
      titulo_tarefa: body.titulo_tarefa,
      descricao_tarefa: body.descricao_tarefa || null,
      status_tarefa: body.status_tarefa || 'A_FAZER',
      responsavel_tarefa_id: body.responsavel_tarefa_id || null,
      data_inicio_prevista_tarefa: body.data_inicio_prevista_tarefa || null,
      data_fim_prevista_tarefa: body.data_fim_prevista_tarefa || null,
      horas_estimadas: body.horas_estimadas !== undefined ? Number(body.horas_estimadas) : null,
      prioridade: body.prioridade !== undefined ? Number(body.prioridade) : 3,
      depende_de_tarefa_id: body.depende_de_tarefa_id || null,
    };

    const fields = Object.keys(tarefaData);
    const placeholders = fields.map(() => '?').join(', ');

    await connection.execute(
      `INSERT INTO projeto_tarefas (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`,
      Object.values(tarefaData)
    );

    await recalcularProgressoProjeto(projeto_id, connection);
    await connection.commit();

    const [createdTarefaRows]: any = await connection.execute(
        `SELECT pt.*, u.name as responsavel_tarefa_nome
         FROM projeto_tarefas pt
         LEFT JOIN users u ON pt.responsavel_tarefa_id = u.id
         WHERE pt.id = ?`, [tarefaId]);

    return NextResponse.json(createdTarefaRows[0], { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Erro ao criar tarefa:', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID de referência inválido (Responsável ou Tarefa Dependente).' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao criar tarefa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projeto_id } = params;
  let connection: Connection | null = null;
  try {
    if (!projeto_id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();

    let query = `
      SELECT
        pt.*,
        u.name as responsavel_tarefa_nome
      FROM projeto_tarefas pt
      LEFT JOIN users u ON pt.responsavel_tarefa_id = u.id
      WHERE pt.projeto_id = ?
    `;

    const queryParams: any[] = [projeto_id];

    if (searchParams.get('status_tarefa')) {
      query += " AND pt.status_tarefa = ?";
      queryParams.push(searchParams.get('status_tarefa'));
    }
    if (searchParams.get('responsavel_tarefa_id')) {
      query += " AND pt.responsavel_tarefa_id = ?";
      queryParams.push(searchParams.get('responsavel_tarefa_id'));
    }

    query += " ORDER BY pt.prioridade ASC, pt.data_fim_prevista_tarefa ASC, pt.created_at ASC";

    const [rows] = await connection.execute(query, queryParams);
    return NextResponse.json(rows);

  } catch (error: any) {
    console.error('Erro ao listar tarefas:', error);
    return NextResponse.json({ error: 'Falha ao listar tarefas', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
