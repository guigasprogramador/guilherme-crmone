import { NextRequest, NextResponse } from 'next/server';
// import { Reuniao } from '@/types/comercial'; // Type might need update
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para converter string DD/MM/YYYY para YYYY-MM-DD
function parseDateString(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  }
  const date = new Date(dateString); // Tenta parsear outros formatos
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return null;
}

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY
function formatDateToDDMMYYYY(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
     // Ajuste para UTC para evitar problemas de fuso horário ao formatar
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
}


// GET - Obter uma reunião específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const { id } = await params;
  console.log(`GET /api/comercial/reunioes/${id} - Iniciando consulta com MySQL`);
  try {
    connection = await getDbConnection();

    const [reuniaoRows]: any = await connection.execute(
      'SELECT * FROM reunioes WHERE id = ?',
      [id]
    );
    
    if (reuniaoRows.length === 0) {
      return NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 });
    }
    
    const reuniao = reuniaoRows[0];

    // Buscar participantes
    const [participantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [id]
    );

    const resultado = {
      ...reuniao,
      data: formatDateToDDMMYYYY(reuniao.data),
      concluida: reuniao.concluida === 1,
      participantes: participantesRows.map((p: any) => ({
          participante_id: p.participante_id,
          tipo_participante: p.tipo_participante,
          confirmado: p.confirmado === 1,
      })),
    };

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao buscar reunião (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar reunião', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar uma reunião
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const { id } = await params;
  console.log(`PUT /api/comercial/reunioes/${id} - Iniciando atualização com MySQL`);
  try {
    const data = await request.json();
    console.log("Dados para atualização:", data);

    if (!data.oportunidadeId || !data.titulo || !data.data || !data.hora) {
      return NextResponse.json({ error: 'ID da oportunidade, título, data e hora são obrigatórios' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const dataSql = parseDateString(data.data);
    const horaSql = data.hora.match(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/) ? data.hora : null;
     if (!horaSql) {
        await connection.rollback();
        return NextResponse.json({ error: 'Formato de hora inválido. Use HH:MM ou HH:MM:SS.'}, { status: 400 });
    }

    const reuniaoFields = {
      oportunidade_id: data.oportunidadeId,
      titulo: data.titulo,
      data: dataSql,
      hora: horaSql,
      local: data.local || null,
      notas: data.notas || null,
      concluida: data.concluida !== undefined ? (Boolean(data.concluida) ? 1 : 0) : 0,
    };

    const fieldNames = Object.keys(reuniaoFields);
    const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
    const values = fieldNames.map(key => reuniaoFields[key as keyof typeof reuniaoFields]);
    
    const sqlUpdateReuniao = `UPDATE reunioes SET ${fieldPlaceholders}, updated_at = NOW() WHERE id = ?`;
    values.push(id);
    
    const [resultUpdate]: any = await connection.execute(sqlUpdateReuniao, values);

    if (resultUpdate.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Reunião não encontrada para atualização' }, { status: 404 });
    }

    // Atualizar participantes: deletar existentes e inserir novos
    await connection.execute('DELETE FROM reunioes_participantes WHERE reuniao_id = ?', [id]);
    if (Array.isArray(data.participantes) && data.participantes.length > 0) {
      for (const p of data.participantes) {
         if (!p.participante_id || !p.tipo_participante) {
          console.warn("Registro de participante inválido ignorado na atualização:", p);
          continue;
        }
        const newParticipanteReuniaoId = uuidv4();
        await connection.execute(
          'INSERT INTO reunioes_participantes (id, reuniao_id, participante_id, tipo_participante, confirmado, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [newParticipanteReuniaoId, id, p.participante_id, p.tipo_participante, p.confirmado ? 1 : 0 || 0]
        );
      }
    }
    
    await connection.commit();
    console.log("Transação MySQL commitada para atualização da reunião ID:", id);

    // Buscar e retornar a reunião atualizada
    const [updatedReuniaoRows]: any = await connection.execute('SELECT * FROM reunioes WHERE id = ?', [id]);
    const [updatedParticipantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [id]
    );
    
    const resultado = {
      ...updatedReuniaoRows[0],
      data: formatDateToDDMMYYYY(updatedReuniaoRows[0].data),
      concluida: updatedReuniaoRows[0].concluida === 1,
      participantes: updatedParticipantesRows.map((p: any) => ({
          participante_id: p.participante_id,
          tipo_participante: p.tipo_participante,
          confirmado: p.confirmado === 1,
      })),
    };
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao atualizar reunião (MySQL):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação:", rbError.message));
    return NextResponse.json(
      { error: 'Erro ao atualizar reunião', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Marcar reunião como concluída ou atualizar notas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const { id } = await params;
  console.log(`PATCH /api/comercial/reunioes/${id} - Iniciando patch com MySQL`);
  try {
    const data = await request.json();
    const { concluida, notas } = data;

    if (concluida === undefined && notas === undefined) {
      return NextResponse.json({ error: 'Pelo menos um campo (concluida ou notas) deve ser fornecido para atualização' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    
    const fieldsToUpdate: any = {};
    if (concluida !== undefined) fieldsToUpdate.concluida = Boolean(concluida) ? 1 : 0;
    if (notas !== undefined) fieldsToUpdate.notas = notas;

    const fieldNames = Object.keys(fieldsToUpdate);
    const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
    const values = fieldNames.map(key => fieldsToUpdate[key]);

    const sql = `UPDATE reunioes SET ${fieldPlaceholders}, updated_at = NOW() WHERE id = ?`;
    values.push(id);

    const [result]: any = await connection.execute(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Reunião não encontrada ou nenhum dado alterado' }, { status: 404 });
    }
    
    // Buscar e retornar a reunião atualizada
    const [updatedReuniaoRows]: any = await connection.execute('SELECT * FROM reunioes WHERE id = ?', [id]);
    const [updatedParticipantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [id]
    );
     const resultado = {
      ...updatedReuniaoRows[0],
      data: formatDateToDDMMYYYY(updatedReuniaoRows[0].data),
      concluida: updatedReuniaoRows[0].concluida === 1,
      participantes: updatedParticipantesRows.map((p: any) => ({
          participante_id: p.participante_id,
          tipo_participante: p.tipo_participante,
          confirmado: p.confirmado === 1,
      })),
    };
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao atualizar reunião (PATCH MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar reunião', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir uma reunião
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const { id } = await params;
  console.log(`DELETE /api/comercial/reunioes/${id} - Iniciando exclusão com MySQL`);
  try {
    connection = await getDbConnection();
    
    // A exclusão em cascata deve cuidar dos participantes em `reunioes_participantes`
    // Se não houver cascade delete na FK, precisaria deletar de `reunioes_participantes` primeiro.
    // Assumindo que o DDL para `reunioes_participantes.reuniao_id` tem ON DELETE CASCADE.
    const [result]: any = await connection.execute('DELETE FROM reunioes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Reunião excluída com sucesso' });

  } catch (error: any) {
    console.error('Erro ao excluir reunião (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao excluir reunião' },
      { status: 500 }
    );
  }
}
