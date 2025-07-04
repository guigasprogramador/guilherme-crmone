import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { withMiddleware, errorHandler, withDatabase, isValidUUID } from '@/middleware/security';
import { rateLimits } from '@/lib/rate-limit';

// Funções auxiliares (reutilizadas da route principal)
function parseAndValidateDate(dateString: string): string | null {
  if (!dateString) return null;
  
  let date: Date;
  
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      return null;
    }
  } else {
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) return null;
  
  return date.toISOString().split('T')[0];
}

function parseAndValidateTime(timeString: string): string | null {
  if (!timeString) return null;
  
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  if (!timeRegex.test(timeString)) return null;
  
  if (timeString.length === 5) {
    return `${timeString}:00`;
  }
  
  return timeString;
}

function formatDateToBR(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    .toLocaleDateString('pt-BR');
}

async function checkTimeConflicts(
  connection: any,
  data: string,
  hora: string,
  oportunidadeId: string,
  excludeReuniaoId?: string
): Promise<boolean> {
  let sql = `
    SELECT id FROM reunioes 
    WHERE data = ? AND hora = ? AND oportunidade_id = ?
  `;
  const params = [data, hora, oportunidadeId];
  
  if (excludeReuniaoId) {
    sql += ' AND id != ?';
    params.push(excludeReuniaoId);
  }
  
  const [rows]: any = await connection.execute(sql, params);
  return rows.length > 0;
}

async function validateOportunidade(connection: any, oportunidadeId: string): Promise<boolean> {
  const [rows]: any = await connection.execute(
    'SELECT id FROM oportunidades WHERE id = ?',
    [oportunidadeId]
  );
  return rows.length > 0;
}

// GET - Obter reunião específica
async function handleGet(
  request: NextRequest,
  { params, connection }: { params: Promise<{ id: string }>, connection: any }
) {
  const { id } = await params;
  console.log(`GET /api/comercial/reunioes/${id} - Iniciando consulta`);
  
  // Validar UUID
  if (!isValidUUID(id)) {
    return NextResponse.json({ 
      error: 'ID da reunião inválido' 
    }, { status: 400 });
  }

  // Buscar reunião com informações relacionadas
  const [reuniaoRows]: any = await connection.execute(
    `SELECT r.*, o.titulo as oportunidade_titulo, c.nome as cliente_nome, c.id as cliente_id
     FROM reunioes r
     LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
     LEFT JOIN clientes c ON o.cliente_id = c.id
     WHERE r.id = ?`,
    [id]
  );
  
  if (reuniaoRows.length === 0) {
    return NextResponse.json({ 
      error: 'Reunião não encontrada' 
    }, { status: 404 });
  }
  
  const reuniao = reuniaoRows[0];

  // Buscar participantes com detalhes
  const [participantesRows]: any = await connection.execute(
    `SELECT rp.participante_id, rp.tipo_participante, rp.confirmado,
            CASE 
              WHEN rp.tipo_participante = 'interno' THEN u.name
              WHEN rp.tipo_participante = 'cliente' THEN c.nome
              ELSE 'Participante Externo'
            END as nome,
            CASE 
              WHEN rp.tipo_participante = 'interno' THEN u.email
              WHEN rp.tipo_participante = 'cliente' THEN c.contato_email
              ELSE NULL
            END as email
     FROM reunioes_participantes rp
     LEFT JOIN users u ON rp.participante_id = u.id AND rp.tipo_participante = 'interno'
     LEFT JOIN contatos c ON rp.participante_id = c.id AND rp.tipo_participante = 'cliente'
     WHERE rp.reuniao_id = ?`,
    [id]
  );

  const resultado = {
    ...reuniao,
    data: formatDateToBR(reuniao.data),
    concluida: reuniao.concluida === 1,
    participantes: participantesRows.map((p: any) => ({
      participante_id: p.participante_id,
      tipo_participante: p.tipo_participante,
      confirmado: p.confirmado === 1,
      nome: p.nome,
      email: p.email,
    })),
  };

  return NextResponse.json(resultado);
}

// PUT - Atualizar reunião
async function handlePut(
  request: NextRequest,
  { params, connection }: { params: Promise<{ id: string }>, connection: any }
) {
  const { id } = await params;
  console.log(`PUT /api/comercial/reunioes/${id} - Iniciando atualização`);
  
  // Validar UUID
  if (!isValidUUID(id)) {
    return NextResponse.json({ 
      error: 'ID da reunião inválido' 
    }, { status: 400 });
  }

  const data = await request.json();
  console.log("Dados para atualização:", data);

  // Validações básicas
  if (!data.oportunidadeId || !data.titulo || !data.data || !data.hora) {
    return NextResponse.json({ 
      error: 'Campos obrigatórios: oportunidadeId, titulo, data, hora' 
    }, { status: 400 });
  }

  // Verificar se reunião existe
  const [existingReuniao]: any = await connection.execute(
    'SELECT id, oportunidade_id FROM reunioes WHERE id = ?',
    [id]
  );
  
  if (existingReuniao.length === 0) {
    return NextResponse.json({ 
      error: 'Reunião não encontrada' 
    }, { status: 404 });
  }

  // Validar oportunidade
  const oportunidadeExists = await validateOportunidade(connection, data.oportunidadeId);
  if (!oportunidadeExists) {
    return NextResponse.json({ 
      error: 'Oportunidade não encontrada' 
    }, { status: 404 });
  }

  // Validar e parsear data e hora
  const dataSql = parseAndValidateDate(data.data);
  const horaSql = parseAndValidateTime(data.hora);
  
  if (!dataSql) {
    return NextResponse.json({ 
      error: 'Data inválida. Use formato DD/MM/YYYY ou YYYY-MM-DD' 
    }, { status: 400 });
  }
  
  if (!horaSql) {
    return NextResponse.json({ 
      error: 'Hora inválida. Use formato HH:MM' 
    }, { status: 400 });
  }

  await connection.beginTransaction();
  
  try {
    // Verificar conflitos de horário (excluindo a reunião atual)
    const hasConflict = await checkTimeConflicts(
      connection, 
      dataSql, 
      horaSql, 
      data.oportunidadeId,
      id
    );
    
    if (hasConflict) {
      await connection.rollback();
      return NextResponse.json({ 
        error: 'Já existe uma reunião agendada para este horário nesta oportunidade' 
      }, { status: 409 });
    }

    // Atualizar reunião
    const reuniaoFields = {
      oportunidade_id: data.oportunidadeId,
      titulo: data.titulo.trim(),
      data: dataSql,
      hora: horaSql,
      local: data.local?.trim() || null,
      notas: data.notas?.trim() || null,
      concluida: Boolean(data.concluida) ? 1 : 0,
    };

    const fieldNames = Object.keys(reuniaoFields);
    const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
    const values = fieldNames.map(key => reuniaoFields[key as keyof typeof reuniaoFields]);
    
    const sqlUpdateReuniao = `UPDATE reunioes SET ${fieldPlaceholders}, updated_at = NOW() WHERE id = ?`;
    values.push(id);
    
    const [resultUpdate]: any = await connection.execute(sqlUpdateReuniao, values);

    if (resultUpdate.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ 
        error: 'Reunião não encontrada para atualização' 
      }, { status: 404 });
    }

    // Atualizar participantes: deletar existentes e inserir novos
    await connection.execute('DELETE FROM reunioes_participantes WHERE reuniao_id = ?', [id]);
    
    if (Array.isArray(data.participantes) && data.participantes.length > 0) {
      for (const p of data.participantes) {
        if (!p.participante_id || !p.tipo_participante) {
          console.warn("Participante inválido ignorado na atualização:", p);
          continue;
        }
        
        const newParticipanteId = uuidv4();
        await connection.execute(
          `INSERT INTO reunioes_participantes 
           (id, reuniao_id, participante_id, tipo_participante, confirmado, created_at) 
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [newParticipanteId, id, p.participante_id, p.tipo_participante, Boolean(p.confirmado) ? 1 : 0]
        );
      }
    }
    
    await connection.commit();
    console.log("Reunião atualizada com sucesso:", id);

    // Buscar e retornar reunião atualizada
    const [updatedReuniaoRows]: any = await connection.execute(
      `SELECT r.*, o.titulo as oportunidade_titulo, c.nome as cliente_nome
       FROM reunioes r
       LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
       LEFT JOIN clientes c ON o.cliente_id = c.id
       WHERE r.id = ?`,
      [id]
    );
    
    const [updatedParticipantesRows]: any = await connection.execute(
      `SELECT rp.participante_id, rp.tipo_participante, rp.confirmado,
              CASE 
                WHEN rp.tipo_participante = 'interno' THEN u.name
                WHEN rp.tipo_participante = 'cliente' THEN c.nome
                ELSE 'Participante Externo'
              END as nome
       FROM reunioes_participantes rp
       LEFT JOIN users u ON rp.participante_id = u.id AND rp.tipo_participante = 'interno'
       LEFT JOIN contatos c ON rp.participante_id = c.id AND rp.tipo_participante = 'cliente'
       WHERE rp.reuniao_id = ?`,
      [id]
    );
    
    const resultado = {
      ...updatedReuniaoRows[0],
      data: formatDateToBR(updatedReuniaoRows[0].data),
      concluida: updatedReuniaoRows[0].concluida === 1,
      participantes: updatedParticipantesRows.map((p: any) => ({
        participante_id: p.participante_id,
        tipo_participante: p.tipo_participante,
        confirmado: p.confirmado === 1,
        nome: p.nome,
      })),
    };
    
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao atualizar reunião:', error);
    await connection.rollback();
    throw error;
  }
}

// PATCH - Atualização parcial (marcar como concluída, etc.)
async function handlePatch(
  request: NextRequest,
  { params, connection }: { params: Promise<{ id: string }>, connection: any }
) {
  const { id } = await params;
  console.log(`PATCH /api/comercial/reunioes/${id} - Iniciando patch`);
  
  // Validar UUID
  if (!isValidUUID(id)) {
    return NextResponse.json({ 
      error: 'ID da reunião inválido' 
    }, { status: 400 });
  }

  const data = await request.json();
  const { concluida, notas, confirmacao_participante } = data;

  // Verificar se pelo menos um campo foi fornecido
  if (concluida === undefined && notas === undefined && !confirmacao_participante) {
    return NextResponse.json({ 
      error: 'Pelo menos um campo deve ser fornecido para atualização' 
    }, { status: 400 });
  }

  // Verificar se reunião existe
  const [existingReuniao]: any = await connection.execute(
    'SELECT id FROM reunioes WHERE id = ?',
    [id]
  );
  
  if (existingReuniao.length === 0) {
    return NextResponse.json({ 
      error: 'Reunião não encontrada' 
    }, { status: 404 });
  }

  await connection.beginTransaction();
  
  try {
    // Atualizar campos da reunião se fornecidos
    if (concluida !== undefined || notas !== undefined) {
      const fieldsToUpdate: any = {};
      if (concluida !== undefined) fieldsToUpdate.concluida = Boolean(concluida) ? 1 : 0;
      if (notas !== undefined) fieldsToUpdate.notas = notas?.trim() || null;

      const fieldNames = Object.keys(fieldsToUpdate);
      const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
      const values = fieldNames.map(key => fieldsToUpdate[key]);

      const sql = `UPDATE reunioes SET ${fieldPlaceholders}, updated_at = NOW() WHERE id = ?`;
      values.push(id);

      const [result]: any = await connection.execute(sql, values);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ 
          error: 'Reunião não encontrada ou nenhum dado alterado' 
        }, { status: 404 });
      }
    }

    // Atualizar confirmação de participante se fornecido
    if (confirmacao_participante) {
      const { participante_id, confirmado } = confirmacao_participante;
      
      if (participante_id) {
        await connection.execute(
          'UPDATE reunioes_participantes SET confirmado = ? WHERE reuniao_id = ? AND participante_id = ?',
          [Boolean(confirmado) ? 1 : 0, id, participante_id]
        );
      }
    }

    await connection.commit();
    
    // Buscar e retornar reunião atualizada
    const [updatedReuniaoRows]: any = await connection.execute(
      `SELECT r.*, o.titulo as oportunidade_titulo, c.nome as cliente_nome
       FROM reunioes r
       LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
       LEFT JOIN clientes c ON o.cliente_id = c.id
       WHERE r.id = ?`,
      [id]
    );
    
    const [updatedParticipantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [id]
    );
    
    const resultado = {
      ...updatedReuniaoRows[0],
      data: formatDateToBR(updatedReuniaoRows[0].data),
      concluida: updatedReuniaoRows[0].concluida === 1,
      participantes: updatedParticipantesRows.map((p: any) => ({
        participante_id: p.participante_id,
        tipo_participante: p.tipo_participante,
        confirmado: p.confirmado === 1,
      })),
    };
    
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao atualizar reunião (PATCH):', error);
    await connection.rollback();
    throw error;
  }
}

// DELETE - Excluir reunião
async function handleDelete(
  request: NextRequest,
  { params, connection }: { params: Promise<{ id: string }>, connection: any }
) {
  const { id } = await params;
  console.log(`DELETE /api/comercial/reunioes/${id} - Iniciando exclusão`);
  
  // Validar UUID
  if (!isValidUUID(id)) {
    return NextResponse.json({ 
      error: 'ID da reunião inválido' 
    }, { status: 400 });
  }

  await connection.beginTransaction();
  
  try {
    // Verificar se reunião existe
    const [existingReuniao]: any = await connection.execute(
      'SELECT id FROM reunioes WHERE id = ?',
      [id]
    );
    
    if (existingReuniao.length === 0) {
      await connection.rollback();
      return NextResponse.json({ 
        error: 'Reunião não encontrada' 
      }, { status: 404 });
    }

    // Deletar participantes primeiro (se não houver CASCADE)
    await connection.execute('DELETE FROM reunioes_participantes WHERE reuniao_id = ?', [id]);
    
    // Deletar reunião
    const [result]: any = await connection.execute('DELETE FROM reunioes WHERE id = ?', [id]);

    await connection.commit();
    
    return NextResponse.json({ 
      message: 'Reunião excluída com sucesso',
      id: id
    });

  } catch (error: any) {
    console.error('Erro ao excluir reunião:', error);
    await connection.rollback();
    throw error;
  }
}

// Aplicar middlewares
export const GET = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handleGet);

export const PUT = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handlePut);

export const PATCH = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handlePatch);

export const DELETE = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handleDelete);

